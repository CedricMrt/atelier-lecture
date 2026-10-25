import { db } from "./db";

export async function getStarBalance(studentId: string): Promise<number> {
  const wallet = await db.starWallets.get(studentId);

  return wallet?.balance ?? 0;
}

type RewardActivityCode = "tambour_des_sons" | "chemin_des_syllabes";

async function creditActivityRoundStars(
  sessionActivityId: string,
  roundIndex: number,
  expectedActivityCode: RewardActivityCode,
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

      if (activity.activityCode !== expectedActivityCode) {
        throw new Error(
          "L’activité ne correspond pas à la récompense demandée.",
        );
      }

      if (
        activity.timingMode !== "active_time" &&
        roundIndex >= activity.maxScore
      ) {
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

      const transactionId = `${sessionActivityId}:round:${roundIndex}:stars`;

      const existingTransaction = await db.starTransactions.get(transactionId);

      const wallet = await db.starWallets.get(student.id);

      // Un round déjà récompensé ne crédite pas une seconde fois.
      if (existingTransaction) {
        return wallet?.balance ?? 0;
      }

      if (
        activity.status !== "in_progress" ||
        session.status !== "in_progress"
      ) {
        throw new Error("La séance ou l’activité n’est plus en cours.");
      }

      const amount = 5;
      const now = Date.now();
      const balance = (wallet?.balance ?? 0) + amount;

      await db.starTransactions.add({
        id: transactionId,
        studentId: student.id,
        sessionId: session.id,
        sessionActivityId: activity.id,
        activityCode: activity.activityCode,
        roundIndex,
        amount,
        createdAt: now,
      });

      await db.starWallets.put({
        studentId: student.id,
        balance,
        totalEarned: (wallet?.totalEarned ?? 0) + amount,
        updatedAt: now,
      });

      return balance;
    },
  );
}

export async function creditRhythmRoundStars(
  sessionActivityId: string,
  roundIndex: number,
): Promise<number> {
  return creditActivityRoundStars(
    sessionActivityId,
    roundIndex,
    "tambour_des_sons",
  );
}

export async function creditSyllableRoundStars(
  sessionActivityId: string,
  roundIndex: number,
): Promise<number> {
  return creditActivityRoundStars(
    sessionActivityId,
    roundIndex,
    "chemin_des_syllabes",
  );
}
