import { db, type Result } from "./db";

export async function saveRhythmResult(params: {
  sessionId: string;
  sessionActivityId: string;
  studentId: string;
  sequence: number[];
  studentSequence: number[];
  correct: boolean;
  responseTimeMs: number;
  hintsUsed: number;
}) {
  const result: Result = {
    id: crypto.randomUUID(),
    sessionId: params.sessionId,
    sessionActivityId: params.sessionActivityId,
    studentId: params.studentId,
    activityCode: "tambour_des_sons",
    skillCode: "rythme_simple",
    contentLabel: params.sequence.join("-"),
    correct: params.correct ? 1 : 0,
    responseTimeMs: params.responseTimeMs,
    hintsUsed: params.hintsUsed,
    errorType: params.correct
      ? undefined
      : params.sequence.length !== params.studentSequence.length
        ? "longueur_incorrecte"
        : "ordre_incorrect",
    createdAt: Date.now(),
  };

  await db.results.add(result);

  await db.syncQueue.add({
    id: crypto.randomUUID(),
    studentId: params.studentId,
    sessionId: params.sessionId,
    type: "result",
    payload: result,
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
  });

  return result;
}

export async function getPendingResults() {
  return db.syncQueue.where("status").equals("pending").toArray();
}

export async function markSyncItemAsSent(id: string) {
  await db.syncQueue.update(id, {
    status: "sent",
  });
}

export async function markSyncItemAsFailed(id: string) {
  const item = await db.syncQueue.get(id);

  if (!item) return;

  await db.syncQueue.update(id, {
    status: "failed",
    attempts: item.attempts + 1,
  });
}
