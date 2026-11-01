import type { Request, Response, NextFunction } from "express";
import { getStudentByQrToken } from "../data/resultRepository.js";

export async function requireStudentSync(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const student = req.body?.student;

  if (
    typeof student?.qrToken !== "string" ||
    typeof student?.studentId !== "string"
  ) {
    res.status(401).json({
      error: "Élève non identifié.",
    });
    return;
  }

  try {
    const existingStudent = getStudentByQrToken(student.qrToken);

    if (!existingStudent) {
      res.status(401).json({
        error: "Élève inconnu ou carte invalide.",
      });
      return;
    }

    if (existingStudent.studentId !== student.studentId) {
      res.status(401).json({
        error: "Élève non autorisé.",
      });
      return;
    }

    req.student = {
      studentId: existingStudent.studentId,
      classId: existingStudent.classId,
    };

    next();
  } catch (error) {
    console.error("Vérification de l’élève impossible :", error);

    res.status(500).json({
      error: "Erreur lors de la vérification de l’élève.",
    });
  }
}
