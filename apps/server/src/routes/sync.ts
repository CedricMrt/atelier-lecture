import { Router } from "express";
import { saveResults, type StoredResult } from "../data/resultRepository.js";
import { requireStudentSync } from "../middleware/requireStudentSync.js";

const router = Router();

router.use(requireStudentSync);

router.post("/results", (req, res) => {
  const student = req.body?.student;
  const results = req.body?.results;

  if (
    typeof student?.studentId !== "string" ||
    typeof student?.firstName !== "string" ||
    typeof student?.fullName !== "string" ||
    typeof student?.avatarKey !== "string" ||
    typeof student?.avatarVariant !== "string" ||
    typeof student?.qrToken !== "string" ||
    typeof student?.classId !== "string" ||
    !Array.isArray(results)
  ) {
    res.status(400).json({
      error: "Requête de synchronisation invalide.",
      receivedStudent: student ?? null,
    });
    return;
  }

  try {
    const validResults: StoredResult[] = [];

    for (const result of results) {
      if (
        typeof result?.id !== "string" ||
        typeof result?.sessionId !== "string" ||
        typeof result?.sessionActivityId !== "string" ||
        result.studentId !== student.studentId ||
        typeof result?.activityCode !== "string" ||
        typeof result?.skillCode !== "string" ||
        typeof result?.contentLabel !== "string" ||
        (result.correct !== 0 && result.correct !== 1) ||
        typeof result?.responseTimeMs !== "number" ||
        typeof result?.hintsUsed !== "number" ||
        typeof result?.createdAt !== "number"
      ) {
        continue;
      }

      validResults.push(result as StoredResult);
    }

    const acceptedIds = saveResults(validResults);

    res.json({
      acceptedIds,
    });
  } catch (error) {
    console.error("Synchronisation impossible :", error);

    res.status(500).json({
      error: "Erreur pendant l’enregistrement des résultats.",
    });
  }
});

export default router;
