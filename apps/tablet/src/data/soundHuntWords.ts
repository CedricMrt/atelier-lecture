export type SoundPosition = "start" | "middle" | "end";

export type SoundHuntWord = {
  contentId: string;
  contentVersion: number;

  word: string;
  targetSound: string;
  syllables: string[];
  targetSyllableIndex: number;
  position: SoundPosition;
};

export const SOUND_HUNT_WORDS: SoundHuntWord[] = [
  {
    contentId: "soundhunt-boulanger-ou",
    contentVersion: 1,
    word: "boulanger",
    targetSound: "ou",
    syllables: ["bou", "lan", "ger"],
    targetSyllableIndex: 0,
    position: "start",
  },
  {
    contentId: "soundhunt-demander-é",
    contentVersion: 1,
    word: "demander",
    targetSound: "é",
    syllables: ["de", "man", "der"],
    targetSyllableIndex: 2,
    position: "end",
  },
  {
    contentId: "soundhunt-papillon-a",
    contentVersion: 1,
    word: "papillon",
    targetSound: "a",
    syllables: ["pa", "pi", "llon"],
    targetSyllableIndex: 0,
    position: "start",
  },
  {
    contentId: "soundhunt-carillon-i",
    contentVersion: 1,
    word: "carillon",
    targetSound: "i",
    syllables: ["ca", "ri", "llon"],
    targetSyllableIndex: 1,
    position: "middle",
  },
  {
    contentId: "soundhunt-pantalon-on",
    contentVersion: 1,
    word: "pantalon",
    targetSound: "on",
    syllables: ["pan", "ta", "lon"],
    targetSyllableIndex: 2,
    position: "end",
  },
  {
    contentId: "soundhunt-domino-i",
    contentVersion: 1,
    word: "domino",
    targetSound: "i",
    syllables: ["do", "mi", "no"],
    targetSyllableIndex: 1,
    position: "middle",
  },
  {
    contentId: "soundhunt-école-é",
    contentVersion: 1,
    word: "école",
    targetSound: "é",
    syllables: ["é", "cole"],
    targetSyllableIndex: 0,
    position: "start",
  },
  {
    contentId: "soundhunt-manger-an",
    contentVersion: 1,
    word: "manger",
    targetSound: "an",
    syllables: ["man", "ger"],
    targetSyllableIndex: 0,
    position: "start",
  },
  {
    contentId: "soundhunt-girafe-a",
    contentVersion: 1,
    word: "girafe",
    targetSound: "a",
    syllables: ["gi", "rafe"],
    targetSyllableIndex: 1,
    position: "end",
  },
  {
    contentId: "soundhunt-voiture-u",
    contentVersion: 1,
    word: "voiture",
    targetSound: "u",
    syllables: ["voi", "ture"],
    targetSyllableIndex: 1,
    position: "end",
  },
];
