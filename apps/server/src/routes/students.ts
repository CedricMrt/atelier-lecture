import { Router } from "express";
import { sqlite } from "../data/sqliteDatabase.js";

const router = Router();

router.get("/qr/:qrToken", (req, res) => {
  const { qrToken } = req.params;

  const student = sqlite
    .prepare(
      `SELECT
        student_id AS id,
        first_name AS firstName,
        full_name AS fullName,
        avatar_key AS avatarKey,
        avatar_variant AS avatarVariant,
        qr_token AS qrToken,
        class_id AS classId,
        rhythm_mastery AS rhythmMastery,
        phonology_mastery AS phonologyMastery,
        syllables_mastery AS syllablesMastery,
        visual_span_mastery AS visualSpanMastery,
        reading_mastery AS readingMastery,
        comprehension_mastery AS comprehensionMastery
      FROM students
      WHERE qr_token = ?`,
    )
    .get(qrToken);

  if (!student) {
    res.status(404).json({ error: "Carte élève inconnue." });
    return;
  }

  res.json({ student });
});

router.get("/", (_req, res) => {
  const students = sqlite
    .prepare(
      `SELECT
        student_id AS id,
        first_name AS firstName,
        full_name AS fullName,
        avatar_key AS avatarKey,
        avatar_variant AS avatarVariant,
        qr_token AS qrToken,
        class_id AS classId,
        rhythm_mastery AS rhythmMastery,
        phonology_mastery AS phonologyMastery,
        syllables_mastery AS syllablesMastery,
        visual_span_mastery AS visualSpanMastery,
        reading_mastery AS readingMastery,
        comprehension_mastery AS comprehensionMastery
      FROM students
      ORDER BY first_name ASC`,
    )
    .all();

  res.json({ students });
});

export default router;
