import { db, type Student } from "./db";

const demoStudents: Student[] = [
  {
    id: "student-1",
    firstName: "Léa",
    fullName: "Léa Martin",
    avatarKey: "ourse",
    avatarVariant: "violette",
    qrToken: "1d5993f7-9cf2-406b-8c47-441daafb7aa2",
    classId: "class-a",
    rhythmMastery: 60,
    phonologyMastery: 50,
    syllablesMastery: 45,
    visualSpanMastery: 40,
    readingMastery: 50,
    comprehensionMastery: 55,
  },
  {
    id: "student-2",
    firstName: "Lucas",
    fullName: "Lucas Petit",
    avatarKey: "renard",
    avatarVariant: "bleu",
    qrToken: "863c3f00-4c0e-4446-be4e-4763d235884e",
    classId: "class-a",
    rhythmMastery: 35,
    phonologyMastery: 60,
    syllablesMastery: 55,
    visualSpanMastery: 65,
    readingMastery: 45,
    comprehensionMastery: 50,
  },
];

export async function seedDemoData() {
  const existing = await db.students.count();

  if (existing > 0) {
    return;
  }

  await db.students.bulkAdd(demoStudents);
}
