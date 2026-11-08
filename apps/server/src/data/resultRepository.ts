import { randomBytes, randomUUID } from "node:crypto";
import { sqlite } from "./sqliteDatabase.js";

export type StoredStudent = {
  studentId: string;
  displayName: string;
  firstName: string;
  avatarKey: string;
  avatarVariant: string;
  updatedAt: number;
};

export type StudentCard = {
  studentId: string;
  firstName: string;
  fullName: string;
  avatarKey: string;
  avatarVariant: string;
  qrToken: string;
};

export type StoredResult = {
  id: string;
  sessionId: string;
  sessionActivityId: string;
  studentId: string;
  activityCode: string;
  skillCode: string;
  contentId?: string | null;
  contentVersion?: number | null;
  contentLabel: string;
  correct: 0 | 1;
  responseTimeMs: number;
  hintsUsed: number;
  errorType?: string | null;
  createdAt: number;
};

const insertStudent = sqlite.prepare(`
  INSERT INTO students (
    student_id,
    first_name,
    full_name,
    avatar_key,
    avatar_variant,
    qr_token,
    class_id,
    updated_at
  )
  VALUES (
    @studentId,
    @firstName,
    @fullName,
    @avatarKey,
    @avatarVariant,
    @qrToken,
    @classId,
    @updatedAt
  )
  ON CONFLICT(student_id) DO UPDATE SET
    first_name = excluded.first_name,
    full_name = excluded.full_name,
    avatar_key = excluded.avatar_key,
    avatar_variant = excluded.avatar_variant,
    qr_token = excluded.qr_token,
    class_id = excluded.class_id,
    updated_at = excluded.updated_at
`);

const insertResult = sqlite.prepare(`
  INSERT OR IGNORE INTO results (
    id,
    session_id,
    session_activity_id,
    student_id,
    activity_code,
    skill_code,
    content_id,
    content_version,
    content_label,
    correct,
    response_time_ms,
    hints_used,
    error_type,
    created_at
  )
  VALUES (
    @id,
    @sessionId,
    @sessionActivityId,
    @studentId,
    @activityCode,
    @skillCode,
    @contentId,
    @contentVersion,
    @contentLabel,
    @correct,
    @responseTimeMs,
    @hintsUsed,
    @errorType,
    @createdAt
  )
`);

const saveResultsTransaction = sqlite.transaction((results: StoredResult[]) => {
  const acceptedIds: string[] = [];

  for (const result of results) {
    const info = insertResult.run({
      id: result.id,
      sessionId: result.sessionId,
      sessionActivityId: result.sessionActivityId,
      studentId: result.studentId,
      activityCode: result.activityCode,
      skillCode: result.skillCode,
      contentId: result.contentId ?? null,
      contentVersion: result.contentVersion ?? null,
      contentLabel: result.contentLabel,
      correct: result.correct,
      responseTimeMs: result.responseTimeMs,
      hintsUsed: result.hintsUsed,
      errorType: result.errorType ?? null,
      createdAt: result.createdAt,
    });

    if (info.changes > 0) {
      acceptedIds.push(result.id);
    }
  }

  return acceptedIds;
});

export function saveStudentProfile(student: {
  studentId: string;
  firstName: string;
  fullName: string;
  avatarKey: string;
  avatarVariant: string;
  qrToken: string;
  classId: string;
}): void {
  insertStudent.run({
    studentId: student.studentId,
    firstName: student.firstName,
    fullName: student.fullName,
    avatarKey: student.avatarKey,
    avatarVariant: student.avatarVariant,
    qrToken: student.qrToken,
    classId: student.classId,
    updatedAt: Date.now(),
  });
}

export function saveResults(results: StoredResult[]): string[] {
  return saveResultsTransaction(results);
}

export function getStudents(): StoredStudent[] {
  return sqlite
    .prepare(
      `SELECT
        student_id AS studentId,
        full_name AS displayName,
        first_name AS firstName,
        avatar_key AS avatarKey,
        avatar_variant AS avatarVariant,
        updated_at AS updatedAt
      FROM students
      ORDER BY full_name COLLATE NOCASE`,
    )
    .all() as StoredStudent[];
}

export function getStudent(studentId: string): StoredStudent | null {
  return (
    (sqlite
      .prepare(
        `SELECT
          student_id AS studentId,
          full_name AS displayName,
          first_name AS firstName,
          avatar_key AS avatarKey,
          avatar_variant AS avatarVariant,
          updated_at AS updatedAt
        FROM students
        WHERE student_id = ?`,
      )
      .get(studentId) as StoredStudent | undefined) ?? null
  );
}

export function getResultsByStudent(studentId: string): StoredResult[] {
  return sqlite
    .prepare(
      `SELECT
        id,
        session_id AS sessionId,
        session_activity_id AS sessionActivityId,
        student_id AS studentId,
        activity_code AS activityCode,
        skill_code AS skillCode,
        content_id AS contentId,
        content_version AS contentVersion,
        content_label AS contentLabel,
        correct,
        response_time_ms AS responseTimeMs,
        hints_used AS hintsUsed,
        error_type AS errorType,
        created_at AS createdAt
      FROM results
      WHERE student_id = ?
      ORDER BY created_at`,
    )
    .all(studentId) as StoredResult[];
}

export function getStudentByQrToken(qrToken: string) {
  return (
    (sqlite
      .prepare(
        `SELECT
          student_id AS studentId,
          first_name AS firstName,
          full_name AS fullName,
          avatar_key AS avatarKey,
          avatar_variant AS avatarVariant,
          qr_token AS qrToken,
          class_id AS classId,
          updated_at AS updatedAt
        FROM students
        WHERE qr_token = ?
        LIMIT 1`,
      )
      .get(qrToken) as
      | {
          studentId: string;
          firstName: string;
          fullName: string;
          avatarKey: string;
          avatarVariant: string;
          qrToken: string;
          classId: string;
          updatedAt: number;
        }
      | undefined) ?? null
  );
}

export function createStudent(input: {
  firstName: string;
  fullName: string;
  avatarKey: string;
  avatarVariant: string;
  classId?: string;
}): StudentCard {
  const student = {
    studentId: randomUUID(),
    firstName: input.firstName,
    fullName: input.fullName,
    avatarKey: input.avatarKey,
    avatarVariant: input.avatarVariant,
    // Valeur imprimée dans le QR code de la carte : impossible à deviner.
    qrToken: randomBytes(18).toString("base64url"),
    classId: input.classId ?? "classe-1",
  };

  saveStudentProfile(student);

  return {
    studentId: student.studentId,
    firstName: student.firstName,
    fullName: student.fullName,
    avatarKey: student.avatarKey,
    avatarVariant: student.avatarVariant,
    qrToken: student.qrToken,
  };
}

export function getStudentCards(): StudentCard[] {
  return sqlite
    .prepare(
      `SELECT
        student_id AS studentId,
        first_name AS firstName,
        full_name AS fullName,
        avatar_key AS avatarKey,
        avatar_variant AS avatarVariant,
        qr_token AS qrToken
      FROM students
      ORDER BY full_name COLLATE NOCASE`,
    )
    .all() as StudentCard[];
}

/**
 * Supprime un élève sans résultat. Retourne "has-results" si l'élève a déjà
 * des résultats (on ne perd jamais un historique par erreur).
 */
export function deleteStudentWithoutResults(
  studentId: string,
): "deleted" | "not-found" | "has-results" {
  const exists = sqlite
    .prepare("SELECT 1 FROM students WHERE student_id = ?")
    .get(studentId);

  if (!exists) return "not-found";

  const results = sqlite
    .prepare("SELECT COUNT(*) AS count FROM results WHERE student_id = ?")
    .get(studentId) as { count: number };

  if (results.count > 0) return "has-results";

  sqlite.prepare("DELETE FROM students WHERE student_id = ?").run(studentId);

  return "deleted";
}
