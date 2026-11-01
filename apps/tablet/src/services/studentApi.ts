export type ServerStudent = {
  id: string;
  firstName: string;
  fullName: string;
  avatarKey: string;
  avatarVariant: string;
  qrToken: string;
  classId: string;
  rhythmMastery: number;
  phonologyMastery: number;
  syllablesMastery: number;
  visualSpanMastery: number;
  readingMastery: number;
  comprehensionMastery: number;
};

export async function fetchStudentByQrToken(
  qrToken: string,
): Promise<ServerStudent | null> {
  const response = await fetch(
    `/api/students/qr/${encodeURIComponent(qrToken)}`,
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.student ?? null;
}
