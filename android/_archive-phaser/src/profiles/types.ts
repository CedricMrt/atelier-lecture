import type { GameId } from "../data/games";

export type GameProgress = {
  /** Niveau de difficulté courant (1 à MAX_LEVEL). */
  level: number;
  plays: number;
  bestStars: number;
  lastPlayedAt: number;
};

export type Profile = {
  id: string;
  name: string;
  avatarId: string;
  createdAt: number;
  /** Total d'étoiles gagnées, tous jeux confondus. */
  stars: number;
  progress: Partial<Record<GameId, GameProgress>>;
};

export type GameResult = {
  gameId: GameId;
  /** 1 à 3 étoiles (on gagne toujours au moins une étoile). */
  stars: number;
  /** Part de bonnes réponses du premier coup, de 0 à 1. */
  accuracy: number;
};

export type StoreData = {
  version: 1;
  profiles: Profile[];
};
