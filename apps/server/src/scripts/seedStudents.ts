import crypto from "node:crypto";
import { sqlite } from "../data/sqliteDatabase.js";

type StudentSeed = {
  studentId: string;
  firstName: string;
  fullName: string;
  avatarKey: string;
  avatarVariant: string;
  classId: string;
};

const students: StudentSeed[] = [
  {
    studentId: "student-1",
    firstName: "Léa",
    fullName: "Léa Martin",
    avatarKey: "renard",
    avatarVariant: "a",
    classId: "classe-demo",
  },
  {
    studentId: "student-3",
    firstName: "Lucas",
    fullName: "Lucas Dupont",
    avatarKey: "hibou",
    avatarVariant: "a",
    classId: "classe-demo",
  },
];

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
    class_id = excluded.class_id,
    updated_at = excluded.updated_at
`);

const seed = sqlite.transaction(() => {
  for (const student of students) {
    insertStudent.run({
      ...student,
      qrToken: crypto.randomUUID(),
      updatedAt: Date.now(),
    });
  }
});

seed();

const created = sqlite
  .prepare("SELECT student_id, full_name, qr_token FROM students")
  .all();

console.log("Élèves enregistrés :");
console.table(created);
