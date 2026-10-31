import type { Request, Response, NextFunction } from "express";
import { TEACHER_API_TOKEN } from "../config/env.js";

export function requireTeacherToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (header !== `Bearer ${TEACHER_API_TOKEN}`) {
    res.status(401).json({ error: "Accès enseignant non autorisé" });
    return;
  }

  next();
}
