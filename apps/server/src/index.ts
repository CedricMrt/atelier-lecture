import express from "express";
import type { Request, Response, NextFunction } from "express";
import teacherRouter from "./routes/teacher.js";
import syncRouter from "./routes/sync.js";

const app = express();
const PORT = 3000;

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

app.use("/api/sync", syncRouter);
app.use("/api/enseignant", teacherRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 [SERVEUR] Démarré avec succès !`);
  console.log(`💻 Local : http://localhost:${PORT}/api/health`);
  console.log(
    `🌐 Réseau : Récupérez votre IP avec 'ipconfig' et testez sur la tablette.\n`,
  );
});
