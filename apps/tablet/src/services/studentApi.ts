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
