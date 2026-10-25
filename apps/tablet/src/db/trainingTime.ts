import { db } from "./db";

type ClockState = {
  runId: string;
  sessionActivityId: string;
  lastCumulativeMs: number;
};

export type TrainingTimeSnapshot = {
  sessionActiveMs: number;
  activityActiveMs: number;

  sessionRemainingMs: number;
  activityRemainingMs: number;

  sessionExpired: boolean;
  activityBudgetReached: boolean;
};

function getClockKey(sessionId: string) {
  return `training-clock:${sessionId}`;
}

function readClockState(value: unknown): ClockState {
  if (
    typeof value !== "object" ||
    value === null ||
    !("runId" in value) ||
    !("sessionActivityId" in value) ||
    !("lastCumulativeMs" in value) ||
    typeof value.runId !== "string" ||
    typeof value.sessionActivityId !== "string" ||
    typeof value.lastCumulativeMs !== "number" ||
    !Number.isFinite(value.lastCumulativeMs) ||
    value.lastCumulativeMs < 0
  ) {
    throw new Error("L’état du compteur d’entraînement est invalide.");
  }

  return {
    runId: value.runId,
    sessionActivityId: value.sessionActivityId,
    lastCumulativeMs: value.lastCumulativeMs,
  };
}

export async function beginTrainingClock(
  sessionId: string,
  sessionActivityId: string,
): Promise<string> {
  const runId = crypto.randomUUID();

  await db.transaction(
    "rw",
    [db.sessions, db.sessionActivities, db.appState],
    async () => {
      const session = await db.sessions.get(sessionId);

      const activity = await db.sessionActivities.get(sessionActivityId);

      if (!session || !activity || activity.sessionId !== session.id) {
        throw new Error("Séance ou activité introuvable.");
      }

      if (
        session.status !== "in_progress" ||
        activity.status !== "in_progress"
      ) {
        throw new Error("Le compteur nécessite une activité en cours.");
      }

      if (
        session.timingMode !== "active_time" ||
        activity.timingMode !== "active_time"
      ) {
        throw new Error("Cette séance n’utilise pas le temps actif.");
      }

      // Une nouvelle ouverture remplace l’ancien compteur.
      // Les écritures d’une ancienne page seront refusées.
      await db.appState.put({
        key: getClockKey(sessionId),
        value: {
          runId,
          sessionActivityId,
          lastCumulativeMs: 0,
        } satisfies ClockState,
      });
    },
  );

  return runId;
}

export async function checkpointTrainingTime(params: {
  sessionId: string;
  sessionActivityId: string;
  runId: string;
  cumulativeActiveMs: number;
}): Promise<TrainingTimeSnapshot> {
  const { sessionId, sessionActivityId, runId, cumulativeActiveMs } = params;

  if (!Number.isFinite(cumulativeActiveMs) || cumulativeActiveMs < 0) {
    throw new Error("Le temps d’entraînement est invalide.");
  }

  return db.transaction(
    "rw",
    [db.sessions, db.sessionActivities, db.appState],
    async () => {
      const clockEntry = await db.appState.get(getClockKey(sessionId));

      if (!clockEntry) {
        throw new Error("Le compteur d’entraînement n’est pas ouvert.");
      }

      const clock = readClockState(clockEntry.value);

      if (
        clock.runId !== runId ||
        clock.sessionActivityId !== sessionActivityId
      ) {
        throw new Error("Ce compteur a été remplacé par une autre ouverture.");
      }

      const session = await db.sessions.get(sessionId);

      const activity = await db.sessionActivities.get(sessionActivityId);

      if (!session || !activity || activity.sessionId !== session.id) {
        throw new Error("Séance ou activité introuvable.");
      }

      if (
        session.status !== "in_progress" ||
        activity.status !== "in_progress" ||
        session.timingMode !== "active_time" ||
        activity.timingMode !== "active_time"
      ) {
        throw new Error(
          "Le temps ne peut plus être enregistré pour cette activité.",
        );
      }

      const budgetSeconds = activity.timeBudgetSeconds;

      if (
        budgetSeconds === undefined ||
        !Number.isFinite(budgetSeconds) ||
        budgetSeconds <= 0
      ) {
        throw new Error("Le budget de l’activité est invalide.");
      }

      const sessionLimitMs = session.durationLimitSeconds * 1000;

      const previousSessionMs = session.activeDurationMs ?? 0;

      const previousActivityMs = activity.activeDurationMs ?? 0;

      // Un checkpoint ancien ou répété n’ajoute rien.
      const nextCumulativeMs = Math.max(
        clock.lastCumulativeMs,
        cumulativeActiveMs,
      );

      const requestedDelta = nextCumulativeMs - clock.lastCumulativeMs;

      // Le plafond global reste strict.
      const acceptedDelta = Math.min(
        requestedDelta,
        Math.max(0, sessionLimitMs - previousSessionMs),
      );

      const sessionActiveMs = previousSessionMs + acceptedDelta;

      const activityActiveMs = previousActivityMs + acceptedDelta;

      await db.sessions.update(session.id, {
        activeDurationMs: sessionActiveMs,
      });

      await db.sessionActivities.update(activity.id, {
        activeDurationMs: activityActiveMs,
      });

      await db.appState.put({
        key: getClockKey(sessionId),
        value: {
          ...clock,
          lastCumulativeMs: nextCumulativeMs,
        } satisfies ClockState,
      });

      const sessionRemainingMs = Math.max(0, sessionLimitMs - sessionActiveMs);

      const activityRemainingMs = Math.max(
        0,
        budgetSeconds * 1000 - activityActiveMs,
      );

      return {
        sessionActiveMs,
        activityActiveMs,
        sessionRemainingMs,
        activityRemainingMs,
        sessionExpired: sessionRemainingMs === 0,
        activityBudgetReached: activityRemainingMs === 0,
      };
    },
  );
}

export async function releaseTrainingClock(
  sessionId: string,
  runId: string,
): Promise<void> {
  await db.transaction("rw", db.appState, async () => {
    const key = getClockKey(sessionId);
    const entry = await db.appState.get(key);

    if (!entry) return;

    const clock = readClockState(entry.value);

    // Une ancienne page ne ferme pas le compteur
    // éventuellement ouvert par une nouvelle page.
    if (clock.runId === runId) {
      await db.appState.delete(key);
    }
  });
}
