import Dexie, { type EntityTable } from "dexie";

export type Student = {
  id: string;
  firstName: string;
  fullName: string;
  avatarKey: string;
  avatarVariant: string;
  qrToken: string;
  classId: string;
  rhythmMastery: number;
  phonologyMastery: number;
  syllablesMastery: number;
  visualSpanMastery: number;
  readingMastery: number;
  comprehensionMastery: number;
};

export type Session = {
  id: string;
  studentId: string;
  startedAt: number;
  endedAt?: number;
  durationLimitSeconds: number;
  status: "in_progress" | "completed" | "interrupted";
  mode: "automatic" | "forced";
  totalStars: number;
};

export type SessionActivity = {
  type: string;
  id: string;
  sessionId: string;
  activityCode: string;
  position: number;
  level: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  startedAt?: number;
  completedAt?: number;
  score?: number;
  maxScore: number;
  stars?: number;
  durationSeconds?: number;
};

export type Result = {
  id: string;
  sessionId: string;
  sessionActivityId: string;
  studentId: string;
  activityCode: string;
  skillCode: string;
  contentLabel: string;
  correct: 0 | 1;
  responseTimeMs: number;
  hintsUsed: number;
  errorType?: string;
  createdAt: number;
};

export type SyncQueueItem = {
  id: string;
  studentId: string;
  sessionId: string;
  type: "result" | "activity-end" | "session-end";
  payload: unknown;
  status: "pending" | "sent" | "failed";
  attempts: number;
  createdAt: number;
};

export type AppState = {
  key: string;
  value: unknown;
};

export type StarWallet = {
  studentId: string;
  balance: number;
  totalEarned: number;
  updatedAt: number;
};

export type StarTransaction = {
  id: string;
  studentId: string;
  sessionId: string;
  sessionActivityId: string;
  activityCode: string;
  roundIndex: number;
  amount: number;
  createdAt: number;
};

export const db = new Dexie("AtelierLectureDB") as Dexie & {
  students: EntityTable<Student, "id">;
  sessions: EntityTable<Session, "id">;
  sessionActivities: EntityTable<SessionActivity, "id">;
  results: EntityTable<Result, "id">;
  syncQueue: EntityTable<SyncQueueItem, "id">;
  appState: EntityTable<AppState, "key">;

  starWallets: EntityTable<StarWallet, "studentId">;
  starTransactions: EntityTable<StarTransaction, "id">;
};

db.version(1).stores({
  students: "id, qrToken, classId, firstName",
  sessions: "id, studentId, startedAt, status",
  sessionActivities: "id, sessionId, activityCode, position, status",
  results:
    "id, sessionId, sessionActivityId, studentId, activityCode, skillCode, createdAt",
  syncQueue: "id, studentId, sessionId, status, createdAt",
  appState: "key",
});

db.version(2).stores({
  starWallets: "studentId, updatedAt",
  starTransactions: "id, studentId, sessionId, sessionActivityId, createdAt",
});
