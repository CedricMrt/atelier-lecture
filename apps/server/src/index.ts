import express from "express";
import path from "node:path";
import https from "node:https";
import type { Request, Response, NextFunction } from "express";
import teacherRouter from "./routes/teacher.js";
import syncRouter from "./routes/sync.js";
import cookieParser from "cookie-parser";
import teacherAuthRouter from "./routes/teacherAuth.js";
import { ensureDefaultTeacher } from "./data/teacherStore.js";
import { requireTeacherSession } from "./middleware/teacherSession.js";
import studentsRouter from "./routes/students.js";
import { requireStudentSync } from "./middleware/requireStudentSync.js";
import { ensureCertificate, type TlsMaterial } from "./tls/certificate.js";

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

async function startServer() {
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

  let tls: TlsMaterial | null = null;

  try {
    tls = await ensureCertificate();
  } catch (error) {
    console.error("Certificat HTTPS impossible à préparer :", error);
  }

  const banner = () => {
    console.log("\n========================================");
    console.log("  ATELIER LECTURE — SERVEUR DE CLASSE");
    console.log("========================================\n");
  };

  if (tls) {
    const { key, cert, addresses, regenerated } = tls;

    const httpsServer = https.createServer({ key, cert }, app);

    httpsServer.listen(PORT, "0.0.0.0", () => {
      banner();

      console.log("✅ Serveur HTTPS démarré.");

      if (regenerated) {
        console.log(
          "🔐 Un nouveau certificat a été créé : les tablettes devront l'accepter à nouveau.",
        );
      }

      console.log(`💻 Sur ce PC : https://localhost:${PORT}/adulte/connexion`);
      console.log("");
      console.log("📱 Adresse à ouvrir sur les tablettes :");

      if (addresses.length === 0) {
        console.log("   Aucune connexion réseau détectée : branche le Wi-Fi.");
      }

      addresses.forEach((address, index) => {
        console.log(
          `   https://${address}:${PORT}${index === 0 ? "   <-- celle-ci en priorité" : ""}`,
        );
      });

      console.log("");

      if (addresses[0]) {
        console.log(`🩺 Test réseau : https://${addresses[0]}:${PORT}/api/health`);
        console.log("");
      }

      console.log("⚠️  Au premier accès, accepte le certificat auto-signé.");
      console.log("⚠️  Laisse cette fenêtre ouverte pendant la séance.");
      console.log("");
    });
  } else {
    app.listen(PORT, "0.0.0.0", () => {
      banner();

      console.log("⚠️  Serveur HTTP démarré (certificat HTTPS indisponible).");
      console.log(
        "⚠️  La caméra et le scan QR peuvent être bloqués sur tablette.",
      );
      console.log("");
      console.log(`💻 http://localhost:${PORT}/adulte/connexion`);
      console.log("");
    });
  }
}

void startServer();
