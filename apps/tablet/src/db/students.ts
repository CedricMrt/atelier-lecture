import type { Student } from "./db";
import { db } from "./db";

export async function replaceServerStudents(
  students: Student[],
): Promise<void> {
  await db.transaction("rw", db.students, async () => {
    await db.students.clear();

    await db.students.bulkPut(students);
  });
}

export async function getLocalStudents(): Promise<Student[]> {
  return db.students.toArray();
}

export async function saveCurrentStudent(student: Student): Promise<void> {
  await db.transaction("rw", db.students, async () => {
    await db.students.put(student);
  });
}
