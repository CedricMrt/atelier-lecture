// Logique du « Pont du volcan », sans Phaser : facile à tester.

export type VolcanoWord = {
  word: string;
  /** Image-indice provisoire (sera remplacée par un vrai dessin). */
  emoji: string;
  level: 1 | 2 | 3;
  /** Écriture pour la synthèse vocale, si elle prononce mal le mot. */
  spoken?: string;
};

export const VOLCANO_WORDS: VolcanoWord[] = [
  // Niveau 1 : 3 lettres
  { word: "lit", emoji: "🛏️", level: 1 },
  { word: "rat", emoji: "🐀", level: 1 },
  { word: "bol", emoji: "🥣", level: 1 },
  { word: "sac", emoji: "👜", level: 1 },
  { word: "mur", emoji: "🧱", level: 1 },
  { word: "lac", emoji: "🏞️", level: 1 },
  { word: "riz", emoji: "🍚", level: 1 },
  // Niveau 2 : 4 lettres
  { word: "lune", emoji: "🌙", level: 2 },
  { word: "robe", emoji: "👗", level: 2 },
  { word: "vase", emoji: "🏺", level: 2 },
  { word: "cube", emoji: "🧊", level: 2 },
  { word: "moto", emoji: "🏍️", level: 2 },
  { word: "kiwi", emoji: "🥝", level: 2 },
  { word: "lama", emoji: "🦙", level: 2 },
  { word: "sofa", emoji: "🛋️", level: 2 },
  // Niveau 3 : 5 lettres
  { word: "lapin", emoji: "🐰", level: 3 },
  { word: "radio", emoji: "📻", level: 3 },
  { word: "balai", emoji: "🧹", level: 3 },
  { word: "pomme", emoji: "🍎", level: 3 },
  { word: "fusée", emoji: "🚀", level: 3 },
  { word: "robot", emoji: "🤖", level: 3 },
  { word: "tigre", emoji: "🐯", level: 3 },
  { word: "zèbre", emoji: "🦓", level: 3 },
  { word: "pizza", emoji: "🍕", level: 3 },
];

// Lettres qui se ressemblent par la forme ou par le son : ce sont les pièges.
const CONFUSABLE: Record<string, string[]> = {
  a: ["o", "e", "u"],
  b: ["d", "p", "q"],
  c: ["s", "k", "e"],
  d: ["b", "t", "q"],
  e: ["é", "a", "c", "o"],
  é: ["e", "è", "ê"],
  è: ["e", "é", "ê"],
  f: ["v", "t", "l"],
  g: ["q", "j", "p"],
  h: ["n", "b", "k"],
  i: ["l", "j", "t"],
  j: ["i", "g", "y"],
  k: ["h", "c", "x"],
  l: ["i", "t", "j"],
  m: ["n", "w", "u"],
  n: ["m", "u", "h"],
  o: ["a", "e", "u", "c"],
  p: ["b", "q", "d"],
  q: ["g", "p", "b"],
  r: ["n", "v", "t"],
  s: ["z", "c", "x"],
  t: ["f", "l", "d"],
  u: ["n", "v", "a"],
  v: ["u", "w", "f"],
  w: ["v", "m", "u"],
  x: ["k", "s", "z"],
  y: ["v", "j", "g"],
  z: ["s", "x", "n"],
};

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export function lettersOf(word: string): string[] {
  return [...word.normalize("NFC")];
}

/** Nombre de dalles proposées pour chaque lettre. */
export function tilesPerColumn(level: number): number {
  return level >= 3 ? 4 : 3;
}

/**
 * Pour chaque lettre du mot, une colonne de dalles mélangées :
 * la bonne lettre et des lettres pièges proches.
 */
export function buildColumns(
  word: string,
  level: number,
  rng: Rng = Math.random,
): string[][] {
  const size = tilesPerColumn(level);

  return lettersOf(word).map((letter) => {
    const chosen: string[] = [letter];

    for (const candidate of shuffle(CONFUSABLE[letter] ?? [], rng)) {
      if (chosen.length >= size) break;
      if (!chosen.includes(candidate)) chosen.push(candidate);
    }

    for (const candidate of shuffle(ALPHABET, rng)) {
      if (chosen.length >= size) break;
      if (!chosen.includes(candidate)) chosen.push(candidate);
    }

    return shuffle(chosen, rng);
  });
}

/** Mots d'une partie : ceux du niveau, complétés au besoin par les niveaux plus faciles. */
export function pickWords(
  level: number,
  count: number,
  rng: Rng = Math.random,
): VolcanoWord[] {
  const exact = shuffle(
    VOLCANO_WORDS.filter((item) => item.level === level),
    rng,
  );

  const easier = shuffle(
    VOLCANO_WORDS.filter((item) => item.level < level),
    rng,
  );

  return [...exact, ...easier].slice(0, count);
}

export function accuracyFrom(totalLetters: number, errors: number): number {
  if (totalLetters <= 0) return 0;

  return totalLetters / (totalLetters + errors);
}

/** On gagne toujours au moins une étoile : l'enfant ne repart jamais les mains vides. */
export function starsFromErrors(errors: number): number {
  if (errors <= 2) return 3;
  if (errors <= 6) return 2;

  return 1;
}
