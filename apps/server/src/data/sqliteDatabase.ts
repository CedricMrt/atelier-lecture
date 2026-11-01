import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DATABASE_PATH = path.join(DATA_DIR, "atelier-lecture-v1.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const sqlite = new Database(DATABASE_PATH);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS students (
  student_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_key TEXT NOT NULL,
  avatar_variant TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE,
  class_id TEXT NOT NULL,
  rhythm_mastery INTEGER NOT NULL DEFAULT 0,
  phonology_mastery INTEGER NOT NULL DEFAULT 0,
  syllables_mastery INTEGER NOT NULL DEFAULT 0,
  visual_span_mastery INTEGER NOT NULL DEFAULT 0,
  reading_mastery INTEGER NOT NULL DEFAULT 0,
  comprehension_mastery INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    session_activity_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    activity_code TEXT NOT NULL,
    skill_code TEXT NOT NULL,
    content_id TEXT,
    content_version INTEGER,
    content_label TEXT NOT NULL,
    correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
    response_time_ms INTEGER NOT NULL,
    hints_used INTEGER NOT NULL,
    error_type TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
  );

  CREATE INDEX IF NOT EXISTS idx_students_qr_token
    ON students (qr_token);

  CREATE INDEX IF NOT EXISTS idx_results_student
    ON results (student_id, created_at);

  CREATE INDEX IF NOT EXISTS idx_results_session
    ON results (session_id, created_at);

  CREATE INDEX IF NOT EXISTS idx_results_activity
    ON results (session_activity_id, created_at);
`);
