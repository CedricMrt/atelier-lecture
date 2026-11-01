import { Router } from "express";
import {
  createSession,
  deleteSession,
  getSession,
  getTeacherById,
  verifyTeacher,
} from "../data/teacherStore.js";

const router = Router();

router.post("/connexion", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Identifiant ou mot de passe manquant." });
    return;
  }

  const teacher = await verifyTeacher(username, password);

  if (!teacher) {
    res.status(401).json({ error: "Identifiant ou mot de passe incorrect." });
    return;
  }

  const session = await createSession(teacher.teacherId);

  res.cookie("teacherSession", session.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({
    teacher: {
      teacherId: teacher.teacherId,
      displayName: teacher.displayName,
    },
  });
});

router.post("/deconnexion", async (req, res) => {
  const sessionId = req.cookies?.teacherSession;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  res.clearCookie("teacherSession", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  res.json({ status: "deconnecte" });
});

router.get("/session", async (req, res) => {
  const sessionId = req.cookies?.teacherSession;

  if (!sessionId) {
    res.status(401).json({ error: "Non connecté" });
    return;
  }

  const session = await getSession(sessionId);

  if (!session) {
    res.status(401).json({ error: "Session expirée" });
    return;
  }

  const teacher = await getTeacherById(session.teacherId);

  if (!teacher) {
    res.status(401).json({ error: "Enseignant introuvable" });
    return;
  }

  res.json({
    teacher: {
      teacherId: teacher.teacherId,
      username: teacher.username,
      displayName: teacher.displayName,
    },
  });
});

export default router;
