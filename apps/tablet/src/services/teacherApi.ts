export type Student = {
  studentId: string;
  displayName: string;
  firstName?: string;
  avatarKey?: string;
  avatarVariant?: string;
};

export type StudentCard = {
  studentId: string;
  firstName: string;
  fullName: string;
  avatarKey: string;
  avatarVariant: string;
  qrToken: string;
};

export type NewStudentInput = {
  firstName: string;
  fullName: string;
  avatarKey: string;
  avatarVariant: string;
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

export type TeacherProfile = {
  teacherId: string;
  username: string;
  displayName: string;
};

export async function fetchCurrentTeacher(): Promise<TeacherProfile | null> {
  const response = await fetch("/api/enseignant/session", {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.teacher ?? null;
}

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
  const response = await fetch("/api/enseignant/eleves", {
    headers: {
      credentials: "include",
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
  const response = await fetch(`/api/enseignant/eleves/${studentId}`, {
    headers: {
      credentials: "include",
    },
  });

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
    `/api/enseignant/eleves/${studentId}/seances/${sessionId}`,
    {
      headers: {
        credentials: "include",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Impossible de charger le détail de cette séance.");
  }

  return response.json();
}

export async function logoutTeacher(): Promise<void> {
  await fetch("/api/enseignant/deconnexion", {
    method: "POST",
    credentials: "include",
  });
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = await response.json();

    return typeof data?.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export async function createStudent(
  input: NewStudentInput,
): Promise<StudentCard> {
  const response = await fetch("/api/enseignant/eleves", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Impossible de créer l’élève."),
    );
  }

  const data = await response.json();

  return data.student;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const response = await fetch(
    `/api/enseignant/eleves/${encodeURIComponent(studentId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "Impossible de supprimer l’élève."),
    );
  }
}

export async function fetchStudentCards(): Promise<StudentCard[]> {
  const response = await fetch("/api/enseignant/eleves/cartes", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Impossible de charger les cartes des élèves.");
  }

  const data = await response.json();

  return data.cards;
}
