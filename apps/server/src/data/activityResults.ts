export type ActivityResult = {
  activityCode: string;
  skillCode: string;
  rounds: {
    roundIndex: number;
    contentLabel: string;
    correct: boolean;
    errorType: string | null;
    hintsUsed: number;
    responseTimeMs: number;
    contentId?: string;
    contentVersion?: number;
  }[];
};

export const resultsBySession: Record<string, ActivityResult[]> = {
  "demo-session-a81d9613-aa05-4b90-8a46-b7ae1d31470a": [
    {
      activityCode: "tambour_des_sons",
      skillCode: "rythme_simple",
      rounds: [
        {
          roundIndex: 0,
          contentLabel: "Attendu : 0-0 ; Réponse : 0-0",
          correct: true,
          errorType: null,
          hintsUsed: 0,
          responseTimeMs: 1279,
        },
        {
          roundIndex: 1,
          contentLabel: "Attendu : 0-1 ; Réponse : 0-1",
          correct: true,
          errorType: null,
          hintsUsed: 0,
          responseTimeMs: 2758,
        },
        {
          roundIndex: 2,
          contentLabel: "Attendu : 1-0 ; Réponse : 1-0",
          correct: true,
          errorType: null,
          hintsUsed: 1,
          responseTimeMs: 1469,
        },
        {
          roundIndex: 3,
          contentLabel: "Attendu : 0-1-0 ; Réponse : 0-1-1",
          correct: false,
          errorType: "ordre_incorrect",
          hintsUsed: 0,
          responseTimeMs: 2586,
        },
      ],
    },
    {
      activityCode: "chemin_des_syllabes",
      skillCode: "conscience_syllabique",
      rounds: [
        {
          roundIndex: 0,
          contentLabel: "citron ; Attendu : 2 ; Réponse : 1",
          correct: false,
          errorType: "syllabes_manquantes",
          hintsUsed: 0,
          responseTimeMs: 2341,
        },
        {
          roundIndex: 1,
          contentLabel: "main ; Attendu : 1 ; Réponse : 1",
          correct: true,
          errorType: null,
          hintsUsed: 0,
          responseTimeMs: 3093,
        },
        {
          roundIndex: 2,
          contentLabel: "caméra ; Attendu : 3 ; Réponse : 3",
          correct: true,
          errorType: null,
          hintsUsed: 0,
          responseTimeMs: 1761,
        },
        {
          roundIndex: 3,
          contentLabel: "maison ; Attendu : 2 ; Réponse : 2",
          correct: true,
          errorType: null,
          hintsUsed: 0,
          responseTimeMs: 1768,
        },
      ],
    },
    {
      activityCode: "chasse_aux_sons",
      skillCode: "phonologie",
      rounds: [
        {
          roundIndex: 0,
          contentLabel: "carillon ; cible : i ; syllabe choisie : ri",
          correct: true,
          errorType: null,
          hintsUsed: 0,
          responseTimeMs: 1440,
          contentId: "soundhunt-carillon-i",
          contentVersion: 2,
        },
        {
          roundIndex: 1,
          contentLabel: "domino ; cible : i ; syllabe choisie : mi",
          correct: true,
          errorType: null,
          hintsUsed: 0,
          responseTimeMs: 2524,
          contentId: "soundhunt-domino-i",
          contentVersion: 2,
        },
        {
          roundIndex: 2,
          contentLabel: "boulanger ; cible : ou ; syllabe choisie : lan",
          correct: false,
          errorType: "syllabe_incorrecte",
          hintsUsed: 0,
          responseTimeMs: 1959,
          contentId: "soundhunt-boulanger-ou",
          contentVersion: 2,
        },
      ],
    },
  ],
};
