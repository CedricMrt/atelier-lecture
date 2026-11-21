export type GameId =
  | "volcan"
  | "dedans"
  | "fantomes"
  | "mots-meles"
  | "castors"
  | "rythme";

export type GameInfo = {
  id: GameId;
  title: string;
  description: string;
  emoji: string;
  /** Faux tant que le jeu n'est pas écrit : la tuile est affichée « bientôt ». */
  available: boolean;
};

export const MAX_LEVEL = 3;

export const GAMES: GameInfo[] = [
  {
    id: "volcan",
    title: "Pont du volcan",
    description: "Écoute le mot et traverse la lave sur les bonnes lettres.",
    emoji: "🌋",
    available: true,
  },
  {
    id: "dedans",
    title: "Dedans ou pas ?",
    description: "La lettre est-elle dans la suite qui a clignoté ?",
    emoji: "👀",
    available: false,
  },
  {
    id: "fantomes",
    title: "Chasse aux fantômes",
    description: "Touche le fantôme qui porte le mot entendu.",
    emoji: "👻",
    available: false,
  },
  {
    id: "mots-meles",
    title: "Mots mêlés",
    description: "Retrouve les mots cachés dans la grille.",
    emoji: "🔤",
    available: false,
  },
  {
    id: "castors",
    title: "Pont des castors",
    description: "Complète le mot avec le bon groupe de lettres.",
    emoji: "🦫",
    available: false,
  },
  {
    id: "rythme",
    title: "Course au rythme",
    description: "Tape les syllabes en rythme pour enchaîner les combos.",
    emoji: "🥁",
    available: false,
  },
];

export function getGame(id: GameId): GameInfo {
  return GAMES.find((game) => game.id === id) ?? GAMES[0];
}
