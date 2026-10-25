import type { Session, SessionActivity } from "../db/db";

export const TRAINING_RULES = {
  sessionLimitSeconds: 60, //20 * 60,

  // Budgets provisoires pour les deux activités disponibles.
  rhythmBudgetSeconds: 20, // 5 * 60,
  syllablesBudgetSeconds: 20, //3 * 60,

  // Fréquence cible des points de sauvegarde du compteur.
  checkpointIntervalMs: 1000,

  // Barème commun des missions chronométrées.
  twoStarsSuccessRate: 0.6,
  threeStarsSuccessRate: 0.8,
} as const;

export function usesActiveTime(
  item: Pick<Session | SessionActivity, "timingMode">,
): boolean {
  return item.timingMode === "active_time";
}

export function getSessionRemainingMs(
  session: Session,
  additionalActiveMs = 0,
): number {
  const usedMs = Math.max(
    0,
    (session.activeDurationMs ?? 0) + additionalActiveMs,
  );

  return Math.max(0, session.durationLimitSeconds * 1000 - usedMs);
}

export function getActivityRemainingMs(
  activity: SessionActivity,
  additionalActiveMs = 0,
): number | null {
  if (!usesActiveTime(activity) || activity.timeBudgetSeconds === undefined) {
    return null;
  }

  const usedMs = Math.max(
    0,
    (activity.activeDurationMs ?? 0) + additionalActiveMs,
  );

  return Math.max(0, activity.timeBudgetSeconds * 1000 - usedMs);
}

export function getRatingStars(
  correctAnswers: number,
  answeredRounds: number,
): number {
  if (
    !Number.isInteger(correctAnswers) ||
    !Number.isInteger(answeredRounds) ||
    correctAnswers < 0 ||
    answeredRounds < 0 ||
    correctAnswers > answeredRounds
  ) {
    throw new Error("Le bilan contient un nombre de réponses invalide.");
  }

  // Pas de réponse validée : pas d’étoile de bilan.
  if (answeredRounds === 0) {
    return 0;
  }

  const successRate = correctAnswers / answeredRounds;

  if (successRate >= TRAINING_RULES.threeStarsSuccessRate) {
    return 3;
  }

  if (successRate >= TRAINING_RULES.twoStarsSuccessRate) {
    return 2;
  }

  return 1;
}

export function formatRemainingTime(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
