import { db, type Student } from "./db";

const demoStudents: Student[] = [
  {
    id: "demo-student-1",
    firstName: "Léa",
    fullName: "Léa Martin",
    avatarKey: "renarde",
    avatarVariant: "orange",
    qrToken: "ATL-LEA-001",
    classId: "demo-class-a",
    rhythmMastery: 60,
    phonologyMastery: 50,
    syllablesMastery: 45,
    visualSpanMastery: 40,
    readingMastery: 50,
    comprehensionMastery: 55,
  },
  {
    id: "demo-student-2",
    firstName: "Lucas",
    fullName: "Lucas Petit",
    avatarKey: "hibou",
    avatarVariant: "bleu",
    qrToken: "ATL-LUCAS-002",
    classId: "demo-class-a",
    rhythmMastery: 35,
    phonologyMastery: 60,
    syllablesMastery: 55,
    visualSpanMastery: 65,
    readingMastery: 45,
    comprehensionMastery: 50,
  },
  {
    id: "demo-student-3",
    firstName: "Léa",
    fullName: "Léa Dupont",
    avatarKey: "renarde",
    avatarVariant: "bleu",
    qrToken: "ATL-LEA-003",
    classId: "demo-class-a",
    rhythmMastery: 75,
    phonologyMastery: 40,
    syllablesMastery: 65,
    visualSpanMastery: 30,
    readingMastery: 60,
    comprehensionMastery: 45,
  },
];

export async function seedDemoData() {
  const existing = await db.students.count();

  if (existing > 0) {
    return;
  }

  await db.students.bulkAdd(demoStudents);
}
