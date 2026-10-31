import { Router } from "express";
import { requireTeacherToken } from "../middleware/teacherAuth.js";
import {
  getResultsByStudent,
  getStudent,
  getStudents,
} from "../data/syncStore.js";

const router = Router();

router.use(requireTeacherToken);

router.get("/eleves", async (_req, res) => {
  const students = await getStudents();

  res.json({
    students: students.map((student) => ({
      studentId: student.studentId,
      displayName: student.displayName,
    })),
  });
});

router.get("/eleves/:studentId", async (req, res) => {
  const { studentId } = req.params;

  const student = await getStudent(studentId);

  if (!student) {
    res.status(404).json({ error: "Élève introuvable" });
    return;
  }

  const results = await getResultsByStudent(studentId);

  const sessionsBySessionId = new Map<
    string,
    {
      sessionId: string;
      startedAt: number;
      activities: Map<
        string,
        {
          activityCode: string;
          skillCode: string;
          roundsTotal: number;
          correctCount: number;
          hintsUsed: number;
        }
      >;
    }
  >();

  for (const result of results) {
    const session = sessionsBySessionId.get(result.sessionId) ?? {
      sessionId: result.sessionId,
      startedAt: result.createdAt,
      activities: new Map(),
    };

    session.startedAt = Math.min(session.startedAt, result.createdAt);

    const activity = session.activities.get(result.sessionActivityId) ?? {
      activityCode: result.activityCode,
      skillCode: result.skillCode,
      roundsTotal: 0,
      correctCount: 0,
      hintsUsed: 0,
    };

    activity.roundsTotal += 1;
    activity.correctCount += result.correct;
    activity.hintsUsed += result.hintsUsed;

    session.activities.set(result.sessionActivityId, activity);
    sessionsBySessionId.set(result.sessionId, session);
  }

  const sessions = [...sessionsBySessionId.values()]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((session) => ({
      sessionId: session.sessionId,
      startedAt: new Date(session.startedAt).toISOString(),
      activities: [...session.activities.values()],
    }));

  res.json({
    student: {
      studentId: student.studentId,
      displayName: student.displayName,
    },
    sessions,
  });
});

router.get("/eleves/:studentId/seances/:sessionId", async (req, res) => {
  const { studentId, sessionId } = req.params;

  const student = await getStudent(studentId);

  if (!student) {
    res.status(404).json({ error: "Élève introuvable" });
    return;
  }

  const allResults = await getResultsByStudent(studentId);
  const sessionResults = allResults.filter(
    (result) => result.sessionId === sessionId,
  );

  if (sessionResults.length === 0) {
    res.status(404).json({ error: "Séance introuvable pour cet élève" });
    return;
  }

  const activitiesByActivityId = new Map<
    string,
    {
      activityCode: string;
      skillCode: string;
      rounds: typeof sessionResults;
    }
  >();

  for (const result of sessionResults) {
    const activity = activitiesByActivityId.get(result.sessionActivityId) ?? {
      activityCode: result.activityCode,
      skillCode: result.skillCode,
      rounds: [],
    };

    activity.rounds.push(result);
    activitiesByActivityId.set(result.sessionActivityId, activity);
  }

  const activities = [...activitiesByActivityId.values()].map((activity) => ({
    activityCode: activity.activityCode,
    skillCode: activity.skillCode,
    rounds: activity.rounds.slice().sort((a, b) => a.createdAt - b.createdAt),
  }));

  res.json({
    student: {
      studentId: student.studentId,
      displayName: student.displayName,
    },
    session: {
      sessionId,
      startedAt: new Date(
        Math.min(...sessionResults.map((result) => result.createdAt)),
      ).toISOString(),
      activities: activities.map((activity) => ({
        activityCode: activity.activityCode,
        skillCode: activity.skillCode,
        roundsTotal: activity.rounds.length,
        correctCount: activity.rounds.filter((round) => round.correct === 1)
          .length,
        hintsUsed: activity.rounds.reduce(
          (total, round) => total + round.hintsUsed,
          0,
        ),
      })),
    },
    activities,
  });
});

export default router;
