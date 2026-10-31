import { Router } from "express";
import { requireDeviceToken } from "../middleware/deviceAuth.js";
import {
  saveResults,
  saveStudentProfile,
  type StoredResult,
} from "../data/syncStore.js";

const router = Router();

router.use(requireDeviceToken);

router.post("/results", async (req, res) => {
  const student = req.body?.student;
  const results = req.body?.results;

  if (
    typeof student?.studentId !== "string" ||
    typeof student?.displayName !== "string" ||
    !Array.isArray(results)
  ) {
    res.status(400).json({
      error: "Requête de synchronisation invalide.",
    });
    return;
  }

  await saveStudentProfile({
    studentId: student.studentId,
    displayName: student.displayName,
  });

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

  const acceptedIds = await saveResults(validResults);

  res.json({
    acceptedIds,
  });
});

export default router;
