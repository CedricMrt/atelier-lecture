import { MAX_LEVEL } from "../data/games.ts";
import type { GameProgress, GameResult } from "./types";

export const LEVEL_UP_ACCURACY = 0.85;
export const LEVEL_DOWN_ACCURACY = 0.6;

export function emptyProgress(): GameProgress {
  return { level: 1, plays: 0, bestStars: 0, lastPlayedAt: 0 };
}

/** Parcours adaptatif simple : on monte si c'est réussi, on descend si c'est trop dur. */
export function nextLevel(currentLevel: number, accuracy: number): number {
  if (accuracy >= LEVEL_UP_ACCURACY) {
    return Math.min(MAX_LEVEL, currentLevel + 1);
  }

  if (accuracy < LEVEL_DOWN_ACCURACY) {
    return Math.max(1, currentLevel - 1);
  }

  return currentLevel;
}

export function applyResult(
  previous: GameProgress | undefined,
  result: GameResult,
  now: number,
): GameProgress {
  const base = previous ?? emptyProgress();

  return {
    level: nextLevel(base.level, result.accuracy),
    plays: base.plays + 1,
    bestStars: Math.max(base.bestStars, result.stars),
    lastPlayedAt: now,
  };
}
