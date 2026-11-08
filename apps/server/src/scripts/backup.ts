import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// Lancé depuis apps/server (comme le serveur) : data/ est donc ici.
const DATA_DIR = path.join(process.cwd(), "data");
const DATABASE_PATH = path.join(DATA_DIR, "atelier-lecture-v1.db");
const TEACHERS_PATH = path.join(DATA_DIR, "teachers.json");

// Dossier "backups" à la racine du projet (ou du dossier d'installation).
const BACKUP_DIR =
  process.env.BACKUP_DIR ?? path.resolve(process.cwd(), "../../backups");

const KEEP_LAST = 30;
const quiet = process.argv.includes("--quiet");

function log(message: string) {
  if (!quiet) console.log(message);
}

function timestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
}

function pruneOldBackups() {
  const databases = fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => /^atelier-lecture-.*\.db$/.test(name))
    .sort()
    .reverse();

  for (const name of databases.slice(KEEP_LAST)) {
    fs.rmSync(path.join(BACKUP_DIR, name), { force: true });

    // Le fichier des comptes enseignants de la même sauvegarde.
    fs.rmSync(
      path.join(BACKUP_DIR, name.replace(/\.db$/, "-teachers.json")),
      { force: true },
    );
  }
}

async function main() {
  if (!fs.existsSync(DATABASE_PATH)) {
    log("Aucune base de données à sauvegarder pour le moment.");
    return;
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Sauvegarde automatique (au démarrage) : inutile de multiplier les copies
  // si la dernière date de moins d'une heure. Une sauvegarde manuelle se fait toujours.
  if (quiet) {
    const newest = fs
      .readdirSync(BACKUP_DIR)
      .filter((name) => /^atelier-lecture-.*\.db$/.test(name))
      .map((name) => fs.statSync(path.join(BACKUP_DIR, name)).mtimeMs)
      .sort((a, b) => b - a)[0];

    if (newest !== undefined && Date.now() - newest < 60 * 60 * 1000) {
      return;
    }
  }

  const base = `atelier-lecture-${timestamp()}`;
  const databaseTarget = path.join(BACKUP_DIR, `${base}.db`);

  // fileMustExist : ne crée jamais une base vide par erreur.
  const source = new Database(DATABASE_PATH, { fileMustExist: true });

  try {
    // Copie cohérente, même si le serveur tourne et écrit en même temps.
    await source.backup(databaseTarget);
  } finally {
    source.close();
  }

  if (fs.existsSync(TEACHERS_PATH)) {
    fs.copyFileSync(
      TEACHERS_PATH,
      path.join(BACKUP_DIR, `${base}-teachers.json`),
    );
  }

  pruneOldBackups();

  log("Sauvegarde créée :");
  log(`  ${databaseTarget}`);
  log(`(les ${KEEP_LAST} dernières sauvegardes sont conservées)`);
}

main().catch((error) => {
  console.error("Sauvegarde impossible :", error);
  process.exitCode = 1;
});
