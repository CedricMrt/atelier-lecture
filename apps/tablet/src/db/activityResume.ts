import { db } from "./db";

import type { RhythmResult } from "../games/RhythmDrumScene";
import type { SyllableResult } from "../games/SyllablePathScene";

export async function getActivityResume(
  sessionActivityId: string,
  activityCode: string,
) {
  const activity = await db.sessionActivities.get(sessionActivityId);

  if (!activity || activity.activityCode !== activityCode) {
    throw new Error("Activité introuvable ou incohérente.");
  }

  const session = await db.sessions.get(activity.sessionId);

  if (!session) {
    throw new Error("Séance introuvable.");
  }

  const results = await db.results
    .where("sessionActivityId")
    .equals(sessionActivityId)
    .toArray();

  const prefix = `${sessionActivityId}:round:`;

  const indexed = results.map((result) => {
    if (
      result.sessionId !== session.id ||
      result.studentId !== session.studentId ||
      result.activityCode !== activityCode ||
      !result.id.startsWith(prefix) ||
      !result.id.endsWith(":result")
    ) {
      throw new Error(
        "Cette activité contient un ancien historique " +
          "ou des résultats incompatibles avec la reprise. " +
          "Utilise une nouvelle séance pour tester.",
      );
    }

    const indexText = result.id.slice(prefix.length, -":result".length);

    if (!/^\d+$/.test(indexText)) {
      throw new Error("Numéro de round enregistré invalide.");
    }

    return {
      index: Number(indexText),
      result,
    };
  });

  indexed.sort((a, b) => a.index - b.index);

  indexed.forEach((item, expectedIndex) => {
    const invalidOrder = item.index !== expectedIndex;

    const exceedsFixedLimit =
      activity.timingMode !== "active_time" && item.index >= activity.maxScore;

    if (invalidOrder || exceedsFixedLimit) {
      throw new Error("L’historique des rounds est incomplet ou incohérent.");
    }
  });

  const rhythmAnswers: RhythmResult["answers"] = [];
  const syllableAnswers: SyllableResult["answers"] = [];

  let hintsUsed = 0;

  for (const { result } of indexed) {
    hintsUsed += result.hintsUsed;

    if (activityCode === "tambour_des_sons") {
      const match = result.contentLabel.match(
        /^Attendu : ([0-9-]*) ; Réponse : ([0-9-]*)$/,
      );

      if (!match) {
        throw new Error("Format de résultat rythmique incompatible.");
      }

      const toSequence = (value: string) =>
        value === "" ? [] : value.split("-").map(Number);

      rhythmAnswers.push({
        sequence: toSequence(match[1]),
        studentSequence: toSequence(match[2]),
        correct: result.correct === 1,
        responseTimeMs: result.responseTimeMs,
      });
    } else if (activityCode === "chemin_des_syllabes") {
      const match = result.contentLabel.match(
        /^(.*?) ; Attendu : (\d+) ; Réponse : (\d+)$/,
      );

      if (!match) {
        throw new Error("Format de résultat syllabique incompatible.");
      }

      syllableAnswers.push({
        word: match[1],
        expectedSyllables: Number(match[2]),
        studentSyllables: Number(match[3]),
        correct: result.correct === 1,
        responseTimeMs: result.responseTimeMs,
      });
    } else {
      throw new Error("Cette activité ne possède pas encore de reprise.");
    }
  }

  return {
    rhythmAnswers,
    syllableAnswers,
    hintsUsed,
  };
}
