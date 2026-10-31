const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

const TEACHER_API_TOKEN =
  import.meta.env.VITE_TEACHER_API_TOKEN ?? "prototype-token-local";

export type Student = {
  studentId: string;
  displayName: string;
};

export type SessionActivitySummary = {
  activityCode: string;
  skillCode: string;
  roundsTotal: number;
  correctCount: number;
  hintsUsed: number;
};

export type StudentSession = {
  sessionId: string;
  startedAt: string;
  activities: SessionActivitySummary[];
};

export type StudentDetail = {
  student: Student;
  sessions: StudentSession[];
};

export type ActivityRound = {
  id: string;
  roundIndex: number;
  contentLabel: string;
  correct: boolean;
  errorType: string | null;
  hintsUsed: number;
  responseTimeMs: number;
  contentId?: string;
  contentVersion?: number;
};

export type SessionActivityDetail = {
  activityCode: string;
  skillCode: string;
  rounds: ActivityRound[];
};

export type SessionDetail = {
  student: Student;
  session: StudentSession;
  activities: SessionActivityDetail[];
};

export type SoundHuntContent = {
  contentId: string;
  contentVersion: number;
  word: string;
  targetSound: string;
  syllables: string[];
  targetSyllableIndex: number;
  selectedSyllableIndex: number;
  replayUsed: boolean;
};

export function decodeSoundHuntContentLabel(
  contentLabel: string,
): SoundHuntContent | null {
  if (!contentLabel.startsWith("soundhunt:v3:")) {
    return null;
  }

  try {
    return JSON.parse(
      contentLabel.replace("soundhunt:v3:", ""),
    ) as SoundHuntContent;
  } catch {
    return null;
  }
}

export async function fetchStudents(): Promise<Student[]> {
  const response = await fetch(`${API_BASE_URL}/api/enseignant/eleves`, {
    headers: {
      Authorization: `Bearer ${TEACHER_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error("Impossible de charger la liste des élèves.");
  }

  const data = await response.json();
  return data.students;
}

export async function fetchStudentDetail(
  studentId: string,
): Promise<StudentDetail> {
  const response = await fetch(
    `${API_BASE_URL}/api/enseignant/eleves/${studentId}`,
    {
      headers: {
        Authorization: `Bearer ${TEACHER_API_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Impossible de charger la fiche de cet élève.");
  }

  return response.json();
}

export async function fetchSessionDetail(
  studentId: string,
  sessionId: string,
): Promise<SessionDetail> {
  const response = await fetch(
    `${API_BASE_URL}/api/enseignant/eleves/${studentId}/seances/${sessionId}`,
    {
      headers: {
        Authorization: `Bearer ${TEACHER_API_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Impossible de charger le détail de cette séance.");
  }

  return response.json();
}
