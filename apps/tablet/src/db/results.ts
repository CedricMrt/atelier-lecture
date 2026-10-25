import { db, type Result } from "./db";

type CommonResultParams = {
  sessionId: string;
  sessionActivityId: string;
  studentId: string;
  roundIndex?: number;
  correct: boolean;
  responseTimeMs: number;
  hintsUsed: number;
};

type RhythmResultParams = CommonResultParams & {
  sequence: number[];
  studentSequence: number[];
};

type SyllableResultParams = CommonResultParams & {
  word: string;
  expectedSyllables: number;
  studentSyllables: number;
};

type SaveResultParams = CommonResultParams & {
  activityCode: string;
  skillCode: string;
  contentLabel: string;
  errorType?: string;
};

function validateCommonParams(params: CommonResultParams) {
  if (!params.sessionId || !params.sessionActivityId || !params.studentId) {
    throw new Error("Les identifiants du résultat sont incomplets.");
  }

  if (
    params.roundIndex !== undefined &&
    (!Number.isInteger(params.roundIndex) || params.roundIndex < 0)
  ) {
    throw new Error("Le numéro du round est invalide.");
  }

  if (!Number.isFinite(params.responseTimeMs) || params.responseTimeMs < 0) {
    throw new Error("Le temps de réponse est invalide.");
  }

  if (!Number.isInteger(params.hintsUsed) || params.hintsUsed < 0) {
    throw new Error("Le nombre d’aides est invalide.");
  }
}

async function saveActivityResult(params: SaveResultParams): Promise<Result> {
  validateCommonParams(params);

  const resultId =
    params.roundIndex === undefined
      ? crypto.randomUUID()
      : `${params.sessionActivityId}:round:${params.roundIndex}:result`;

  return db.transaction(
    "rw",
    [db.sessions, db.sessionActivities, db.results, db.syncQueue],
    async () => {
      const session = await db.sessions.get(params.sessionId);

      if (!session) {
        throw new Error("La séance est introuvable.");
      }

      if (session.studentId !== params.studentId) {
        throw new Error(
          "Le résultat ne correspond pas à l’élève de la séance.",
        );
      }

      const activity = await db.sessionActivities.get(params.sessionActivityId);

      if (!activity || activity.sessionId !== session.id) {
        throw new Error("L’activité ne correspond pas à la séance.");
      }

      if (activity.activityCode !== params.activityCode) {
        throw new Error("Le type de résultat ne correspond pas à l’activité.");
      }

      if (
        activity.timingMode !== "active_time" &&
        params.roundIndex !== undefined &&
        params.roundIndex >= activity.maxScore
      ) {
        throw new Error("Le numéro du round dépasse le nombre prévu.");
      }

      const existingResult = await db.results.get(resultId);

      // Le même round déjà enregistré n'est pas ajouté
      // une seconde fois.
      if (existingResult) {
        return existingResult;
      }

      const now = Date.now();

      const result: Result = {
        id: resultId,
        sessionId: params.sessionId,
        sessionActivityId: params.sessionActivityId,
        studentId: params.studentId,
        activityCode: params.activityCode,
        skillCode: params.skillCode,
        contentLabel: params.contentLabel,
        correct: params.correct ? 1 : 0,
        responseTimeMs: params.responseTimeMs,
        hintsUsed: params.hintsUsed,
        errorType: params.errorType,
        createdAt: now,
      };

      await db.results.add(result);

      await db.syncQueue.add({
        id: `${resultId}:sync`,
        studentId: params.studentId,
        sessionId: params.sessionId,
        type: "result",
        payload: result,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      return result;
    },
  );
}

export async function saveRhythmResult(
  params: RhythmResultParams,
): Promise<Result> {
  return saveActivityResult({
    ...params,

    activityCode: "tambour_des_sons",
    skillCode: "rythme_simple",

    contentLabel:
      `Attendu : ${params.sequence.join("-")} ; ` +
      `Réponse : ${params.studentSequence.join("-")}`,

    errorType: params.correct
      ? undefined
      : params.sequence.length !== params.studentSequence.length
        ? "longueur_incorrecte"
        : "ordre_incorrect",
  });
}

export async function saveSyllableResult(
  params: SyllableResultParams,
): Promise<Result> {
  if (!params.word.trim()) {
    throw new Error("Le mot travaillé est manquant.");
  }

  if (
    !Number.isInteger(params.expectedSyllables) ||
    params.expectedSyllables < 1 ||
    !Number.isInteger(params.studentSyllables) ||
    params.studentSyllables < 0
  ) {
    throw new Error("Le nombre de syllabes est invalide.");
  }

  return saveActivityResult({
    ...params,

    activityCode: "chemin_des_syllabes",
    skillCode: "conscience_syllabique",

    contentLabel:
      `${params.word} ; ` +
      `Attendu : ${params.expectedSyllables} ; ` +
      `Réponse : ${params.studentSyllables}`,

    errorType: params.correct
      ? undefined
      : params.studentSyllables < params.expectedSyllables
        ? "syllabes_manquantes"
        : params.studentSyllables > params.expectedSyllables
          ? "syllabes_en_trop"
          : "reponse_incorrecte",
  });
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
  await db.transaction("rw", db.syncQueue, async () => {
    const item = await db.syncQueue.get(id);

    if (!item) return;

    await db.syncQueue.update(id, {
      status: "failed",
      attempts: item.attempts + 1,
    });
  });
}
