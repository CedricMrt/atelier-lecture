export type SoundHuntAnswer = {
  // Absents sur les anciennes réponses.
  contentId?: string;
  contentVersion?: number;

  word: string;
  targetSound: string;
  syllables: string[];
  targetSyllableIndex: number;
  selectedSyllableIndex: number;
  correct: boolean;
  responseTimeMs: number;
  replayUsed: boolean;
};

type SoundHuntContent = Pick<
  SoundHuntAnswer,
  | "contentId"
  | "contentVersion"
  | "word"
  | "targetSound"
  | "syllables"
  | "targetSyllableIndex"
  | "selectedSyllableIndex"
  | "replayUsed"
>;

const LEGACY_PREFIX = "soundhunt:v2:";
const CURRENT_PREFIX = "soundhunt:v3:";

export function validateSoundHuntContent(
  value: unknown,
): asserts value is SoundHuntContent {
  if (typeof value !== "object" || value === null) {
    throw new Error("Réponse Chasse au son invalide.");
  }

  const item = value as Record<string, unknown>;

  if (
    typeof item.word !== "string" ||
    !item.word.trim() ||
    typeof item.targetSound !== "string" ||
    !item.targetSound.trim()
  ) {
    throw new Error("Le mot ou le son recherché est manquant.");
  }

  if (
    !Array.isArray(item.syllables) ||
    item.syllables.length === 0 ||
    !item.syllables.every(
      (syllable) => typeof syllable === "string" && syllable.trim().length > 0,
    )
  ) {
    throw new Error("Le découpage en syllabes est invalide.");
  }

  const count = item.syllables.length;

  for (const key of ["targetSyllableIndex", "selectedSyllableIndex"]) {
    const index = item[key];

    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= count
    ) {
      throw new Error("Le numéro de la syllabe est invalide.");
    }
  }

  if (typeof item.replayUsed !== "boolean") {
    throw new Error("L’indicateur de réécoute est invalide.");
  }

  const hasId = item.contentId !== undefined;
  const hasVersion = item.contentVersion !== undefined;

  if (hasId !== hasVersion) {
    throw new Error(
      "L’identifiant et la version du contenu doivent être fournis ensemble.",
    );
  }

  if (hasId) {
    if (typeof item.contentId !== "string" || !item.contentId.trim()) {
      throw new Error("L’identifiant du contenu est invalide.");
    }

    if (
      typeof item.contentVersion !== "number" ||
      !Number.isInteger(item.contentVersion) ||
      item.contentVersion < 1
    ) {
      throw new Error("La version du contenu est invalide.");
    }
  }
}

export function encodeSoundHuntContent(content: SoundHuntContent): string {
  validateSoundHuntContent(content);

  // Cet ordre reste identique à celui de l’ancien format.
  const exercise = {
    word: content.word,
    targetSound: content.targetSound,
    syllables: content.syllables,
    targetSyllableIndex: content.targetSyllableIndex,
    selectedSyllableIndex: content.selectedSyllableIndex,
    replayUsed: content.replayUsed,
  };

  // Préserve le format d’une réponse ancienne non identifiée.
  if (content.contentId === undefined) {
    return LEGACY_PREFIX + JSON.stringify(exercise);
  }

  return (
    CURRENT_PREFIX +
    JSON.stringify({
      contentId: content.contentId,
      contentVersion: content.contentVersion,
      ...exercise,
    })
  );
}

export function decodeSoundHuntContent(label: string): SoundHuntContent {
  const isCurrent = label.startsWith(CURRENT_PREFIX);
  const isLegacy = label.startsWith(LEGACY_PREFIX);

  if (!isCurrent && !isLegacy) {
    throw new Error(
      "Format de résultat Chasse au son non pris en charge. " +
        "Les anciennes réponses Début/Milieu/Fin ne peuvent pas " +
        "être reprises avec cette version.",
    );
  }

  const prefix = isCurrent ? CURRENT_PREFIX : LEGACY_PREFIX;

  const content: unknown = JSON.parse(label.slice(prefix.length));

  validateSoundHuntContent(content);

  if (
    isCurrent &&
    (content.contentId === undefined || content.contentVersion === undefined)
  ) {
    throw new Error(
      "Le résultat versionné ne contient pas son identifiant et sa version.",
    );
  }

  if (
    isLegacy &&
    (content.contentId !== undefined || content.contentVersion !== undefined)
  ) {
    throw new Error(
      "Le résultat utilise un format ancien avec des métadonnées incompatibles.",
    );
  }

  return content;
}
