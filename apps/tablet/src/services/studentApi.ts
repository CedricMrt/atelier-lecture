import type { Student } from "../db/db";

export async function fetchStudentByQrToken(
  qrToken: string,
): Promise<Student | null> {
  const response = await fetch(
    `/api/students/qr/${encodeURIComponent(qrToken)}`,
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return data.student ?? null;
}

export async function fetchStudentsFromServer(): Promise<Student[]> {
  const response = await fetch("/api/students");

  if (!response.ok) {
    throw new Error("Impossible de récupérer les élèves.");
  }

  const data = await response.json();

  if (!Array.isArray(data.students)) {
    throw new Error("Réponse du serveur invalide.");
  }

  return data.students;
}

export type ServerStarBalance = {
  balance: number;
  totalEarned: number;
};

export async function fetchStarBalanceFromServer(
  studentId: string,
): Promise<ServerStarBalance | null> {
  try {
    const response = await fetch(
      `/api/students/${encodeURIComponent(studentId)}/stars`,
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (
      typeof data.balance !== "number" ||
      typeof data.totalEarned !== "number"
    ) {
      return null;
    }

    return {
      balance: data.balance,
      totalEarned: data.totalEarned,
    };
  } catch (error) {
    console.warn("Récupération du solde d’étoiles impossible :", error);

    return null;
  }
}
