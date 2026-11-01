import express from "express";
import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import teacherRouter from "./routes/teacher.js";
import syncRouter from "./routes/sync.js";
import cookieParser from "cookie-parser";
import teacherAuthRouter from "./routes/teacherAuth.js";
import { ensureDefaultTeacher } from "./data/teacherStore.js";
import { requireTeacherSession } from "./middleware/teacherSession.js";
import studentsRouter from "./routes/students.js";
import { requireStudentSync } from "./middleware/requireStudentSync.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());
app.use(cookieParser());

await ensureDefaultTeacher();

app.use("/api/enseignant", teacherAuthRouter);
app.use("/api/enseignant", requireTeacherSession, teacherRouter);
app.use("/api/sync", requireStudentSync, syncRouter);
app.use("/api/students", studentsRouter);

const tabletDistPath = path.resolve(process.cwd(), "../tablet/dist");

app.use(
  express.static(tabletDistPath, {
    maxAge: "1h",
  }),
);

app.get(/^\/(?!api|adulte).*/, (_req, res) => {
  res.sendFile(path.join(tabletDistPath, "index.html"));
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    application: "Atelier Lecture",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("\n========================================");
  console.log("  ATELIER LECTURE — SERVEUR DE CLASSE");
  console.log("========================================\n");

  console.log("✅ Le serveur est démarré.");
  console.log(`💻 Sur ce PC : http://localhost:${PORT}/adulte/connexion`);
  console.log(`🩺 Test réseau : http://localhost:${PORT}/api/health`);
  console.log("");
  console.log(
    "Sur les tablettes, utilise l'adresse affichée dans le fichier .env :",
  );
  console.log("Exemple : http://192.168.1.50:3000");
  console.log("");
  console.log("⚠️  Laisse cette fenêtre ouverte pendant la séance.");
  console.log("");
});
