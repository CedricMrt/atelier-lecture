import express from "express";
import type { Request, Response, NextFunction } from "express";

const app = express();
const PORT = 3000;

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

app.use(express.json());

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 [SERVEUR] Démarré avec succès !`);
  console.log(`💻 Local : http://localhost:${PORT}/api/health`);
  console.log(
    `🌐 Réseau : Récupérez votre IP avec 'ipconfig' et testez sur la tablette.\n`,
  );
});
