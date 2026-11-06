export type RhythmMusicAnswer = {
  contentId: string;
  contentVersion: number;
  word: string;
  displaySyllables: string[];
  spokenSyllables: string[];
  expectedTaps: number;
  studentTaps: number;
  excellentHits: number;
  goodHits: number;
  hits: number;
  correct: boolean;
  responseTimeMs: number;
  replayUsed: boolean;
};

const PREFIX = "rhythm-music:v2:";

type StoredRhythmMusicContent = Omit<
  RhythmMusicAnswer,
  "correct" | "responseTimeMs"
>;

export function encodeRhythmMusicContent(
  content: StoredRhythmMusicContent,
): string {
  return (
    PREFIX +
    JSON.stringify({
      contentId: content.contentId,
      contentVersion: content.contentVersion,
      word: content.word,
      displaySyllables: content.displaySyllables,
      spokenSyllables: content.spokenSyllables,
      expectedTaps: content.expectedTaps,
      studentTaps: content.studentTaps,
      excellentHits: content.excellentHits,
      goodHits: content.goodHits,
      hits: content.hits,
      replayUsed: content.replayUsed,
    })
  );
}

export function decodeRhythmMusicContent(
  label: string,
): StoredRhythmMusicContent {
  if (!label.startsWith(PREFIX)) {
    throw new Error("Format de résultat Rythme musical non reconnu.");
  }

  return JSON.parse(label.slice(PREFIX.length));
}
