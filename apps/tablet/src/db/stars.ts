import { db } from "./db";

export async function getStarBalance(studentId: string): Promise<number> {
  const wallet = await db.starWallets.get(studentId);

  return wallet?.balance ?? 0;
}

export async function creditRhythmRoundStars(
  sessionActivityId: string,
  roundIndex: number,
): Promise<number> {
  if (!Number.isInteger(roundIndex) || roundIndex < 0) {
    throw new Error("Numéro de round invalide.");
  }

  return db.transaction(
    "rw",
    [
      db.students,
      db.sessions,
      db.sessionActivities,
      db.starWallets,
      db.starTransactions,
    ],
    async () => {
      const activity = await db.sessionActivities.get(sessionActivityId);

      if (!activity) {
        throw new Error("Activité introuvable.");
      }

      if (activity.activityCode !== "tambour_des_sons") {
        throw new Error("Cette activité n'est pas le Tambour des sons.");
      }

      if (roundIndex >= activity.maxScore) {
        throw new Error("Ce round dépasse le nombre prévu.");
      }

      const session = await db.sessions.get(activity.sessionId);

      if (!session) {
        throw new Error("Séance introuvable.");
      }

      const student = await db.students.get(session.studentId);

      if (!student) {
        throw new Error("Élève introuvable.");
      }

      const studentId = student.id;

      // Identifiant stable pour ce round de cette activité.
      const transactionId = `${sessionActivityId}:round:${roundIndex}:stars`;

      const existingTransaction = await db.starTransactions.get(transactionId);

      const wallet = await db.starWallets.get(studentId);

      // Si le round a déjà été crédité, ne rien ajouter.
      if (existingTransaction) {
        return wallet?.balance ?? 0;
      }

      if (
        activity.status !== "in_progress" ||
        session.status !== "in_progress"
      ) {
        throw new Error("La séance ou l'activité n'est plus en cours.");
      }

      const amount = 5;
      const now = Date.now();
      const balance = (wallet?.balance ?? 0) + amount;

      await db.starTransactions.add({
        id: transactionId,
        studentId,
        sessionId: session.id,
        sessionActivityId: activity.id,
        activityCode: activity.activityCode,
        roundIndex,
        amount,
        createdAt: now,
      });

      await db.starWallets.put({
        studentId,
        balance,
        totalEarned: (wallet?.totalEarned ?? 0) + amount,
        updatedAt: now,
      });

      return balance;
    },
  );
}
