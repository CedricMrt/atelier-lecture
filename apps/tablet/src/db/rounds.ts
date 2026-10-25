import { db, type Result } from "./db";

import { saveRhythmResult, saveSyllableResult } from "./results";

import {
  creditRhythmRoundStars,
  creditSyllableRoundStars,
  getStarBalance,
} from "./stars";

type CommonRoundParams = {
  sessionId: string;
  sessionActivityId: string;
  studentId: string;
  roundIndex: number;
  correct: boolean;
  responseTimeMs: number;
  hintsUsed: number;
};

export type RhythmRoundParams = CommonRoundParams & {
  sequence: number[];
  studentSequence: number[];
};

export type SyllableRoundParams = CommonRoundParams & {
  word: string;
  expectedSyllables: number;
  studentSyllables: number;
};

export type SavedRound = {
  result: Result;
  starBalance: number;
};

type SaveRoundOptions = {
  params: CommonRoundParams;
  activityCode: string;
  contentLabel: string;
  saveResult: () => Promise<Result>;
  creditStars: () => Promise<number>;
};

async function saveRound(options: SaveRoundOptions): Promise<SavedRound> {
  const { params, activityCode, contentLabel, saveResult, creditStars } =
    options;

  if (!Number.isInteger(params.roundIndex) || params.roundIndex < 0) {
    throw new Error("Numéro de round invalide.");
  }

  return db.transaction(
    "rw",
    [
      db.students,
      db.sessions,
      db.sessionActivities,
      db.results,
      db.syncQueue,
      db.starWallets,
      db.starTransactions,
    ],
    async () => {
      const session = await db.sessions.get(params.sessionId);

      if (!session) {
        throw new Error("Séance introuvable.");
      }

      if (session.studentId !== params.studentId) {
        throw new Error("Ce round ne correspond pas à l’élève de la séance.");
      }

      const student = await db.students.get(params.studentId);

      if (!student) {
        throw new Error("Élève introuvable.");
      }

      const activity = await db.sessionActivities.get(params.sessionActivityId);

      if (
        !activity ||
        activity.sessionId !== session.id ||
        activity.activityCode !== activityCode
      ) {
        throw new Error("Ce round ne correspond pas à l’activité.");
      }

      if (
        activity.timingMode !== "active_time" &&
        params.roundIndex >= activity.maxScore
      ) {
        throw new Error("Ce round dépasse le nombre prévu.");
      }

      if (
        session.status !== "in_progress" ||
        activity.status !== "in_progress"
      ) {
        throw new Error("La séance ou l’activité n’est plus en cours.");
      }

      const resultId = `${activity.id}:round:${params.roundIndex}:result`;

      const existingResult = await db.results.get(resultId);

      // Une nouvelle tentative du même enregistrement
      // est autorisée, mais pas une réponse différente
      // utilisant le même numéro de round.
      if (
        existingResult &&
        (existingResult.sessionId !== params.sessionId ||
          existingResult.studentId !== params.studentId ||
          existingResult.activityCode !== activityCode ||
          existingResult.contentLabel !== contentLabel ||
          existingResult.correct !== (params.correct ? 1 : 0))
      ) {
        throw new Error(
          "Ce round possède déjà une autre réponse. " +
            "L’activité doit être reprise depuis son état enregistré.",
        );
      }

      const result = await saveResult();

      const starBalance =
        result.correct === 1
          ? await creditStars()
          : await getStarBalance(params.studentId);

      return {
        result,
        starBalance,
      };
    },
  );
}

export async function saveRhythmRound(
  params: RhythmRoundParams,
): Promise<SavedRound> {
  const correct =
    params.sequence.length === params.studentSequence.length &&
    params.sequence.every(
      (sound, index) => sound === params.studentSequence[index],
    );

  if (correct !== params.correct) {
    throw new Error("La validation de la réponse rythmique est incohérente.");
  }

  const contentLabel =
    `Attendu : ${params.sequence.join("-")} ; ` +
    `Réponse : ${params.studentSequence.join("-")}`;

  return saveRound({
    params,
    activityCode: "tambour_des_sons",
    contentLabel,

    saveResult: () => saveRhythmResult(params),

    creditStars: () =>
      creditRhythmRoundStars(params.sessionActivityId, params.roundIndex),
  });
}

export async function saveSyllableRound(
  params: SyllableRoundParams,
): Promise<SavedRound> {
  const correct = params.studentSyllables === params.expectedSyllables;

  if (correct !== params.correct) {
    throw new Error("La validation du nombre de syllabes est incohérente.");
  }

  const contentLabel =
    `${params.word} ; ` +
    `Attendu : ${params.expectedSyllables} ; ` +
    `Réponse : ${params.studentSyllables}`;

  return saveRound({
    params,
    activityCode: "chemin_des_syllabes",
    contentLabel,

    saveResult: () => saveSyllableResult(params),

    creditStars: () =>
      creditSyllableRoundStars(params.sessionActivityId, params.roundIndex),
  });
}
