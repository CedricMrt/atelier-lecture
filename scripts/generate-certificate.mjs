import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import selfsigned from "selfsigned";

const certsDir = path.resolve(process.cwd(), "apps/server/certs");

fs.mkdirSync(certsDir, { recursive: true });

function getLocalIpv4Address() {
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

const ipAddress = getLocalIpv4Address();

const attributes = [{ name: "commonName", value: "atelier-lecture.local" }];

const pems = await selfsigned.generate(attributes, {
  days: 365,
  keySize: 2048,
  algorithm: "sha256",
  extensions: [
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: "localhost" },
        { type: 7, ip: "127.0.0.1" },
        { type: 7, ip: ipAddress },
      ],
    },
  ],
});

const privateKey = pems.key ?? pems.private;
const certificate = pems.cert ?? pems.certificate;

if (!privateKey || !certificate) {
  console.error("Impossible de récupérer la clé ou le certificat généré.");
  console.error("Résultat reçu :", pems);
  process.exit(1);
}

fs.writeFileSync(path.join(certsDir, "key.pem"), privateKey);
fs.writeFileSync(path.join(certsDir, "cert.pem"), certificate);

console.log("");
console.log("✅ Certificat HTTPS créé.");
console.log(
  `📱 Adresse à utiliser sur les tablettes : https://${ipAddress}:3000`,
);
console.log("");
