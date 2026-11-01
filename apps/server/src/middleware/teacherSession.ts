import type { Request, Response, NextFunction } from "express";
import { getSession, getTeacherById } from "../data/teacherStore.js";

export async function requireTeacherSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const sessionId = req.cookies?.teacherSession;

  if (!sessionId) {
    res.status(401).json({ error: "Connexion enseignante requise" });
    return;
  }

  const session = await getSession(sessionId);

  if (!session) {
    res.status(401).json({ error: "Session expirée ou invalide" });
    return;
  }

  const teacher = await getTeacherById(session.teacherId);

  if (!teacher) {
    res.status(401).json({ error: "Enseignant introuvable" });
    return;
  }

  req.teacher = {
    teacherId: teacher.teacherId,
    username: teacher.username,
    displayName: teacher.displayName,
  };

  next();
}
