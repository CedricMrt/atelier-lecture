import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { X509Certificate, createPrivateKey } from "node:crypto";

export type TlsMaterial = {
  key: string;
  cert: string;
  // Adresses IPv4 à communiquer pour les tablettes (la plus probable en premier).
  addresses: string[];
  // true si un nouveau certificat vient d'être créé pendant cet appel.
  regenerated: boolean;
};

type EnsureCertificateOptions = {
  certsDir?: string;
  // Force la création d'un nouveau certificat même si l'actuel est valide.
  force?: boolean;
};

const CERT_VALIDITY_DAYS = 365;
const RENEW_BEFORE_MS = 30 * 24 * 60 * 60 * 1000;

// Cartes réseau virtuelles : leurs adresses changent souvent (WSL, VirtualBox…)
// et ne sont jamais celles du Wi-Fi des tablettes.
const VIRTUAL_ADAPTER = /vethernet|virtualbox|vmware|vbox|wsl|hyper-v|docker|loopback/i;

function isIpv4(family: unknown): boolean {
  return family === "IPv4" || family === 4;
}

/**
 * Adresses IPv4 locales utilisables par les tablettes.
 * Les cartes virtuelles sont ignorées, sauf s'il n'en reste aucune autre.
 */
export function getLocalIpv4Addresses(): string[] {
  const found: { name: string; address: string }[] = [];

  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const info of list ?? []) {
      if (
        isIpv4(info.family) &&
        !info.internal &&
        !info.address.startsWith("169.254.")
      ) {
        found.push({ name, address: info.address });
      }
    }
  }

  const physical = found.filter((item) => !VIRTUAL_ADAPTER.test(item.name));
  const chosen = physical.length > 0 ? physical : found;

  return [...new Set(chosen.map((item) => item.address))];
}

function readValidCertificate(
  keyPath: string,
  certPath: string,
  addresses: string[],
): { key: string; cert: string } | null {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    return null;
  }

  try {
    const key = fs.readFileSync(keyPath, "utf8");
    const cert = fs.readFileSync(certPath, "utf8");

    const x509 = new X509Certificate(cert);

    // La clé doit bien correspondre au certificat.
    if (!x509.checkPrivateKey(createPrivateKey(key))) {
      return null;
    }

    // Bientôt expiré (ou déjà expiré) : on le renouvelle.
    if (new Date(x509.validTo).getTime() - Date.now() < RENEW_BEFORE_MS) {
      return null;
    }

    // Toutes les adresses actuelles du PC doivent figurer dans le certificat,
    // sinon la tablette affiche une erreur de nom en plus de l'avertissement.
    const covered = new Set(
      [...(x509.subjectAltName ?? "").matchAll(/IP Address:([0-9.]+)/g)].map(
        (match) => match[1],
      ),
    );

    if (addresses.some((address) => !covered.has(address))) {
      return null;
    }

    return { key, cert };
  } catch {
    return null;
  }
}

async function generateCertificate(
  addresses: string[],
): Promise<{ key: string; cert: string }> {
  // Le typage de selfsigned varie selon les versions : on reste volontairement souple.
  // @ts-ignore
  const selfsignedModule: any = await import("selfsigned");
  const generate =
    selfsignedModule.generate ?? selfsignedModule.default?.generate;

  if (typeof generate !== "function") {
    throw new Error("Le module selfsigned est inutilisable.");
  }

  const altNames = [
    { type: 2, value: "localhost" },
    { type: 7, ip: "127.0.0.1" },
    ...addresses.map((ip) => ({ type: 7, ip })),
  ];

  const pems = await generate(
    [{ name: "commonName", value: "atelier-lecture.local" }],
    {
      days: CERT_VALIDITY_DAYS,
      keySize: 2048,
      algorithm: "sha256",
      extensions: [{ name: "subjectAltName", altNames }],
    },
  );

  const key = pems.key ?? pems.private;
  const cert = pems.cert ?? pems.certificate;

  if (!key || !cert) {
    throw new Error("Impossible de récupérer la clé ou le certificat généré.");
  }

  return { key, cert };
}

/**
 * Retourne un certificat HTTPS utilisable, en le créant ou le renouvelant
 * automatiquement si nécessaire (absent, expirant, ou adresse IP du PC changée).
 */
export async function ensureCertificate(
  options: EnsureCertificateOptions = {},
): Promise<TlsMaterial> {
  const certsDir = options.certsDir ?? path.resolve(process.cwd(), "certs");
  const keyPath = path.join(certsDir, "key.pem");
  const certPath = path.join(certsDir, "cert.pem");

  const addresses = getLocalIpv4Addresses();

  if (!options.force) {
    const existing = readValidCertificate(keyPath, certPath, addresses);

    if (existing) {
      return { ...existing, addresses, regenerated: false };
    }
  }

  const generated = await generateCertificate(addresses);

  fs.mkdirSync(certsDir, { recursive: true });
  fs.writeFileSync(keyPath, generated.key, { mode: 0o600 });
  fs.writeFileSync(certPath, generated.cert);

  return { ...generated, addresses, regenerated: true };
}
