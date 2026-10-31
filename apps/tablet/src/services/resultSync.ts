import { db } from "../db/db";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

const DEVICE_SYNC_TOKEN =
  import.meta.env.VITE_DEVICE_SYNC_TOKEN ?? "prototype-device-token";

const BATCH_SIZE = 25;

export async function syncPendingResults(): Promise<void> {
  const pendingItems = await db.syncQueue
    .where("status")
    .equals("pending")
    .toArray();

  const resultItems = pendingItems.filter((item) => item.type === "result");

  if (resultItems.length === 0) {
    return;
  }

  const itemsByStudent = new Map<string, typeof resultItems>();

  for (const item of resultItems) {
    const currentItems = itemsByStudent.get(item.studentId) ?? [];
    currentItems.push(item);
    itemsByStudent.set(item.studentId, currentItems);
  }

  for (const [studentId, items] of itemsByStudent) {
    const student = await db.students.get(studentId);

    if (!student) {
      console.warn(
        `Synchronisation impossible : élève ${studentId} introuvable.`,
      );
      continue;
    }

    for (let index = 0; index < items.length; index += BATCH_SIZE) {
      const batch = items.slice(index, index + BATCH_SIZE);

      try {
        const response = await fetch(`${API_BASE_URL}/api/sync/results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEVICE_SYNC_TOKEN}`,
          },
          body: JSON.stringify({
            student: {
              studentId: student.id,
              displayName: student.fullName,
            },
            results: batch.map((item) => item.payload),
          }),
        });

        if (!response.ok) {
          throw new Error(`Réponse serveur : ${response.status}`);
        }

        const data = await response.json();
        const acceptedIds: string[] = data.acceptedIds ?? [];

        const acceptedItemIds = batch
          .filter((item) => {
            const resultId = (item.payload as { id?: string }).id;
            return resultId && acceptedIds.includes(resultId);
          })
          .map((item) => item.id);

        await db.syncQueue.bulkUpdate(
          acceptedItemIds.map((id) => ({
            key: id,
            changes: {
              status: "sent" as const,
            },
          })),
        );
      } catch (error) {
        console.warn(
          "Synchronisation différée : le serveur est indisponible.",
          error,
        );
        return;
      }
    }
  }
}
