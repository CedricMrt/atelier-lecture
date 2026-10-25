import {
  db,
  type Session,
  type SessionActivity,
  type TimingMode,
  type ActivityEndReason,
} from "./db";

import { TRAINING_RULES, getRatingStars } from "../games/trainingRules";

export async function createDemoSession(
  studentId: string,
  timingMode: TimingMode = "fixed_rounds",
): Promise<string> {
  if (!studentId) {
    throw new Error("Aucun élève n’a été sélectionné.");
  }

  const sessionId = `demo-session-${crypto.randomUUID()}`;
  const now = Date.now();

  const session: Session = {
    id: sessionId,
    studentId,
    startedAt: now,
    durationLimitSeconds: TRAINING_RULES.sessionLimitSeconds,
    timingMode,
    activeDurationMs: 0,
    status: "in_progress",
    mode: "automatic",
    totalStars: 0,
  };

  const activities: SessionActivity[] = [
    {
      id: `${sessionId}-activity-1`,
      sessionId,
      activityCode: "tambour_des_sons",
      position: 1,
      level: 1,
      status: "pending",
      maxScore: 5,
      type: "rhythm",
      timingMode,
      timeBudgetSeconds:
        timingMode === "active_time"
          ? TRAINING_RULES.rhythmBudgetSeconds
          : undefined,

      activeDurationMs: 0,
      answeredRounds: 0,
    },
    {
      id: `${sessionId}-activity-2`,
      sessionId,
      activityCode: "chemin_des_syllabes",
      position: 2,
      level: 1,
      status: "pending",
      maxScore: 5,
      type: "syllables",
      timingMode,
      timeBudgetSeconds:
        timingMode === "active_time"
          ? TRAINING_RULES.syllablesBudgetSeconds
          : undefined,

      activeDurationMs: 0,
      answeredRounds: 0,
    },
  ];

  await db.transaction(
    "rw",
    [db.students, db.sessions, db.sessionActivities],
    async () => {
      const student = await db.students.get(studentId);

      if (!student) {
        throw new Error("Impossible de créer la séance : élève introuvable.");
      }

      await db.sessions.add(session);
      await db.sessionActivities.bulkAdd(activities);
    },
  );

  return sessionId;
}

export async function getSession(sessionId: string) {
  return db.sessions.get(sessionId);
}

export async function getSessionActivities(sessionId: string) {
  return db.sessionActivities
    .where("sessionId")
    .equals(sessionId)
    .sortBy("position");
}

export async function completeSessionActivity(
  sessionActivityId: string,
  score: number,
  stars: number,
  durationSeconds: number,
  endReason?: ActivityEndReason,
): Promise<void> {
  await db.transaction(
    "rw",
    [db.sessionActivities, db.sessions, db.results],
    async () => {
      const activity = await db.sessionActivities.get(sessionActivityId);

      if (!activity) {
        throw new Error("Activité introuvable.");
      }

      const session = await db.sessions.get(activity.sessionId);

      if (!session) {
        throw new Error("Séance introuvable.");
      }

      if (
        activity.status === "completed" ||
        activity.endReason === "session_time_limit"
      ) {
        return;
      }

      if (
        session.status !== "in_progress" ||
        activity.status !== "in_progress"
      ) {
        throw new Error("La séance ou l’activité n’est plus en cours.");
      }

      const timed = activity.timingMode === "active_time";

      let finalScore = score;
      let finalMaxScore = activity.maxScore;
      let finalStars = stars;
      let finalDurationSeconds = durationSeconds;

      let answeredRounds: number | undefined;
      let finalReason: ActivityEndReason;

      if (timed) {
        if (endReason !== "time_budget" && endReason !== "session_time_limit") {
          throw new Error(
            "La raison de fin de la mission chronométrée est manquante.",
          );
        }

        finalReason = endReason;

        const results = await db.results
          .where("sessionActivityId")
          .equals(activity.id)
          .toArray();

        if (
          results.some(
            (result) =>
              result.sessionId !== session.id ||
              result.studentId !== session.studentId ||
              result.activityCode !== activity.activityCode,
          )
        ) {
          throw new Error("Les résultats de l’activité sont incohérents.");
        }

        answeredRounds = results.length;

        finalScore = results.filter((result) => result.correct === 1).length;

        finalMaxScore = answeredRounds;

        finalDurationSeconds = (activity.activeDurationMs ?? 0) / 1000;

        finalStars =
          finalReason === "session_time_limit"
            ? 0
            : getRatingStars(finalScore, answeredRounds);
      } else {
        finalReason = "rounds_finished";

        if (
          !Number.isInteger(score) ||
          score < 0 ||
          score > activity.maxScore
        ) {
          throw new Error("Le score de l’activité est invalide.");
        }

        if (!Number.isInteger(stars) || stars < 0 || stars > 3) {
          throw new Error("Le nombre d’étoiles de bilan est invalide.");
        }

        if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
          throw new Error("La durée de l’activité est invalide.");
        }
      }

      const stoppedBySessionLimit = finalReason === "session_time_limit";

      await db.sessionActivities.update(activity.id, {
        // Une activité coupée par le plafond global
        // ne devient pas artificiellement "completed".
        status: stoppedBySessionLimit ? "in_progress" : "completed",

        completedAt: stoppedBySessionLimit ? undefined : Date.now(),

        score: finalScore,
        maxScore: finalMaxScore,
        stars: finalStars,
        durationSeconds: finalDurationSeconds,

        answeredRounds,
        endReason: finalReason,
      });

      const activities = await db.sessionActivities
        .where("sessionId")
        .equals(session.id)
        .toArray();

      const totalStars = activities.reduce(
        (total, item) =>
          item.status === "completed" ? total + (item.stars ?? 0) : total,
        0,
      );

      await db.sessions.update(session.id, {
        totalStars,
      });
    },
  );
}

export async function endSession(sessionId: string): Promise<void> {
  await db.transaction("rw", db.sessions, async () => {
    const session = await db.sessions.get(sessionId);

    if (!session) {
      throw new Error("Impossible de terminer la séance : séance introuvable.");
    }

    // Conserve la première clôture.
    if (session.status === "completed") {
      return;
    }

    await db.sessions.update(session.id, {
      endedAt: session.endedAt ?? Date.now(),
      status: "completed",
    });
  });
}

export async function isSessionExpired(sessionId: string): Promise<boolean> {
  const session = await db.sessions.get(sessionId);

  if (!session) return true;

  if (session.timingMode === "active_time") {
    return (
      (session.activeDurationMs ?? 0) >= session.durationLimitSeconds * 1000
    );
  }

  const elapsedMs = Date.now() - session.startedAt;

  return elapsedMs >= session.durationLimitSeconds * 1000;
}
