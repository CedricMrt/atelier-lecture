// Vérifie, avec le node.exe embarqué, que les modules du serveur se chargent
// (surtout better-sqlite3, qui est compilé pour une version précise de Node).
// Ce fichier est copié temporairement dans apps/server par build-release.ps1.

const Database = require("better-sqlite3");

const db = new Database(":memory:");
db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY)");
db.prepare("INSERT INTO test DEFAULT VALUES").run();
db.close();

Promise.all([
  import("selfsigned"),
  import("express"),
  import("cookie-parser"),
])
  .then(() => {
    console.log(`Modules OK (Node ${process.version})`);
  })
  .catch((error) => {
    console.error("Un module du serveur ne se charge pas :", error);
    process.exit(1);
  });
