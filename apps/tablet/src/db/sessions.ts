import { db, type Session, type SessionActivity } from "./db";

export async function createDemoSession(studentId: string): Promise<string> {
  const sessionId = `demo-session-${Date.now()}`;

  const session: Session = {
    id: sessionId,
    studentId,
    startedAt: Date.now(),
    durationLimitSeconds: 1200,
    status: "in_progress",
    mode: "automatic",
    totalStars: 0,
  };

  await db.sessions.add(session);

  const rhythmActivity: SessionActivity = {
    id: `${sessionId}-activity-1`,
    sessionId,
    activityCode: "tambour_des_sons",
    position: 1,
    level: 1,
    status: "pending",
    maxScore: 5,
    type: "rhythm",
  };

  await db.sessionActivities.add(rhythmActivity);

  const syllablesActivity: SessionActivity = {
    id: `${sessionId}-activity-2`,
    sessionId,
    activityCode: "chemin_des_syllabes",
    position: 2,
    level: 1,
    status: "pending",
    maxScore: 5,
    type: "syllables",
  };

  await db.sessionActivities.add(syllablesActivity);

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
) {
  await db.transaction("rw", db.sessionActivities, db.sessions, async () => {
    const activity = await db.sessionActivities.get(sessionActivityId);

    if (!activity) return;

    await db.sessionActivities.update(sessionActivityId, {
      status: "completed",
      completedAt: Date.now(),
      score,
      stars,
      durationSeconds,
    });

    const session = await db.sessions.get(activity.sessionId);

    if (!session) return;

    await db.sessions.update(session.id, {
      totalStars: session.totalStars + stars,
    });
  });
}

export async function endSession(sessionId: string) {
  await db.sessions.update(sessionId, {
    endedAt: Date.now(),
    status: "completed",
  });
}

export async function isSessionExpired(sessionId: string): Promise<boolean> {
  const session = await db.sessions.get(sessionId);

  if (!session) return true;

  const elapsedSeconds = (Date.now() - session.startedAt) / 1000;

  return elapsedSeconds >= session.durationLimitSeconds;
}
