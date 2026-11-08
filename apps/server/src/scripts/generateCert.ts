import { ensureCertificate } from "../tls/certificate.js";

// Recrée toujours le certificat (commande : pnpm cert).
const tls = await ensureCertificate({ force: true });

console.log("");
console.log("✅ Certificat HTTPS créé.");
console.log("📱 Adresses à utiliser sur les tablettes :");

for (const address of tls.addresses) {
  console.log(`   https://${address}:3000`);
}

console.log("");
