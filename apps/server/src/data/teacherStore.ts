import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

type Teacher = {
  teacherId: string;
  username: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
};

type TeacherSession = {
  sessionId: string;
  teacherId: string;
  createdAt: number;
  expiresAt: number;
};

type TeacherStore = {
  teachers: Record<string, Teacher>;
  sessions: Record<string, TeacherSession>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "teachers.json");

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

async function readStore(): Promise<TeacherStore> {
  try {
    const content = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as TeacherStore;
  } catch {
    return { teachers: {}, sessions: {} };
  }
}

async function writeStore(store: TeacherStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const temporaryPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(temporaryPath, STORE_PATH);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export async function ensureDefaultTeacher(): Promise<void> {
  const store = await readStore();

  if (Object.keys(store.teachers).length > 0) {
    return;
  }

  const salt = crypto.randomBytes(16).toString("hex");

  store.teachers["teacher-demo"] = {
    teacherId: "teacher-demo",
    username: "enseignante",
    displayName: "Enseignante",
    passwordSalt: salt,
    passwordHash: hashPassword("atelier2026", salt),
  };

  await writeStore(store);
}

export async function verifyTeacher(
  username: string,
  password: string,
): Promise<Teacher | null> {
  const store = await readStore();

  const teacher = Object.values(store.teachers).find(
    (item) => item.username === username,
  );

  if (!teacher) {
    return null;
  }

  const candidateHash = hashPassword(password, teacher.passwordSalt);

  const isValid =
    candidateHash.length === teacher.passwordHash.length &&
    crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(teacher.passwordHash, "hex"),
    );

  return isValid ? teacher : null;
}

export async function createSession(
  teacherId: string,
): Promise<TeacherSession> {
  const store = await readStore();

  const session: TeacherSession = {
    sessionId: crypto.randomUUID(),
    teacherId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  store.sessions[session.sessionId] = session;
  await writeStore(store);

  return session;
}

export async function getSession(
  sessionId: string,
): Promise<TeacherSession | null> {
  const store = await readStore();
  const session = store.sessions[sessionId];

  if (!session) {
    return null;
  }

  if (session.expiresAt < Date.now()) {
    delete store.sessions[sessionId];
    await writeStore(store);
    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const store = await readStore();

  if (store.sessions[sessionId]) {
    delete store.sessions[sessionId];
    await writeStore(store);
  }
}

export async function getTeacherById(
  teacherId: string,
): Promise<Teacher | null> {
  const store = await readStore();
  return store.teachers[teacherId] ?? null;
}

export async function changeTeacherPassword(
  teacherId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const store = await readStore();
  const teacher = store.teachers[teacherId];

  if (!teacher) return false;

  const currentHash = hashPassword(currentPassword, teacher.passwordSalt);

  const isValid =
    currentHash.length === teacher.passwordHash.length &&
    crypto.timingSafeEqual(
      Buffer.from(currentHash, "hex"),
      Buffer.from(teacher.passwordHash, "hex"),
    );

  if (!isValid) return false;

  const salt = crypto.randomBytes(16).toString("hex");

  teacher.passwordSalt = salt;
  teacher.passwordHash = hashPassword(newPassword, salt);

  await writeStore(store);

  return true;
}
