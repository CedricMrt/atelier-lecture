import express from "express";
import path from "node:path";
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
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

function getLocalIpv4Address(): string {
  const interfaces = os.networkInterfaces();

  for (const interfaceName of Object.keys(interfaces)) {
    for (const networkInterface of interfaces[interfaceName] ?? []) {
      if (networkInterface.family === "IPv4" && !networkInterface.internal) {
        return networkInterface.address;
      }
    }
  }

  return "127.0.0.1";
}

const keyPath = path.resolve(process.cwd(), "certs/key.pem");
const certPath = path.resolve(process.cwd(), "certs/cert.pem");

const canUseHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);

if (canUseHttps) {
  const httpsServer = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    app,
  );

  httpsServer.listen(PORT, "0.0.0.0", () => {
    const localIp = getLocalIpv4Address();

    console.log("\n========================================");
    console.log("  ATELIER LECTURE — SERVEUR DE CLASSE");
    console.log("========================================\n");

    console.log("✅ Serveur HTTPS démarré.");
    console.log(`💻 Sur ce PC : https://localhost:${PORT}/adulte/connexion`);
    console.log(`🩺 Test réseau : https://localhost:${PORT}/api/health`);
    console.log("");
    console.log("📱 Adresse à ouvrir sur les tablettes :");
    console.log(`https://${localIp}:${PORT}`);
    console.log("");
    console.log("⚠️  Au premier accès, accepte le certificat auto-signé.");
    console.log("⚠️  Laisse cette fenêtre ouverte pendant la séance.");
    console.log("");
  });
} else {
  app.listen(PORT, "0.0.0.0", () => {
    const localIp = getLocalIpv4Address();

    console.log("\n========================================");
    console.log("  ATELIER LECTURE — SERVEUR DE CLASSE");
    console.log("========================================\n");

    console.log("⚠️  Serveur HTTP démarré.");
    console.log(
      "⚠️  La caméra et le scan QR peuvent être bloqués sur tablette.",
    );
    console.log("");
    console.log("Exécute d’abord : pnpm cert");
    console.log("");
    console.log(`💻 http://localhost:${PORT}/adulte/connexion`);
    console.log(`📱 http://${localIp}:${PORT}`);
    console.log("");
  });
}
