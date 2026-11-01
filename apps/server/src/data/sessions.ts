export type Session = {
  sessionId: string;
  startedAt: string;
  activities: {
    activityCode: string;
    skillCode: string;
    roundsTotal: number;
    correctCount: number;
    hintsUsed: number;
  }[];
};

export const sessionsByStudent: Record<string, Session[]> = {
  "student-1": [
    {
      sessionId: "demo-session-a81d9613-aa05-4b90-8a46-b7ae1d31470a",
      startedAt: "2026-10-27T10:30:00.000Z",
      activities: [
        {
          activityCode: "tambour_des_sons",
          skillCode: "rythme_simple",
          roundsTotal: 4,
          correctCount: 3,
          hintsUsed: 1,
        },
        {
          activityCode: "chemin_des_syllabes",
          skillCode: "conscience_syllabique",
          roundsTotal: 4,
          correctCount: 3,
          hintsUsed: 0,
        },
        {
          activityCode: "chasse_aux_sons",
          skillCode: "phonologie",
          roundsTotal: 3,
          correctCount: 2,
          hintsUsed: 0,
        },
      ],
    },
  ],
  "student-3": [
    {
      sessionId: "demo-session-69df9fab-64a4-49e3-aee3-165b8980dcf6",
      startedAt: "2026-10-27T11:00:00.000Z",
      activities: [
        {
          activityCode: "tambour_des_sons",
          skillCode: "rythme_simple",
          roundsTotal: 4,
          correctCount: 3,
          hintsUsed: 1,
        },
        {
          activityCode: "chemin_des_syllabes",
          skillCode: "conscience_syllabique",
          roundsTotal: 4,
          correctCount: 3,
          hintsUsed: 1,
        },
        {
          activityCode: "chasse_aux_sons",
          skillCode: "phonologie",
          roundsTotal: 2,
          correctCount: 2,
          hintsUsed: 0,
        },
      ],
    },
  ],
};
