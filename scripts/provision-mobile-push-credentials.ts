#!/usr/bin/env tsx
/**
 * Provisions mobile push credential blob + unlock key from Firebase admin JSON.
 * Updates .env.local (and documents values for Vercel).
 */
import { createCipheriv, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const envLocalPath = path.join(root, ".env.local");

function loadEnvFile(filePath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(filePath)) return map;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    map.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }
  return map;
}

function upsertEnvLines(filePath: string, updates: Record<string, string>): void {
  const lines = existsSync(filePath) ? readFileSync(filePath, "utf8").split(/\r?\n/) : [];
  const keys = new Set(Object.keys(updates));
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return true;
    const key = trimmed.split("=")[0];
    return !keys.has(key);
  });
  for (const [key, value] of Object.entries(updates)) {
    kept.push(`${key}=${value}`);
  }
  writeFileSync(filePath, `${kept.join("\n").replace(/\n*$/, "")}\n`, "utf8");
}

function encryptBundle(
  bundle: { projectId: string; clientEmail: string; privateKey: string },
  keyHex: string,
): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const enc = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    enc.update(JSON.stringify(bundle), "utf8"),
    enc.final(),
  ]);
  return Buffer.concat([iv, enc.getAuthTag(), ciphertext]).toString("base64");
}

function main(): void {
  const env = loadEnvFile(envLocalPath);
  const encoded = env.get("FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64")?.trim() ?? "";
  if (!encoded) {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 is missing from .env.local",
    );
  }

  const parsed = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8"),
  ) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };

  const bundle = {
    projectId: String(parsed.project_id ?? "").trim(),
    clientEmail: String(parsed.client_email ?? "").trim(),
    privateKey: String(parsed.private_key ?? "").replace(/\\n/g, "\n").trim(),
  };
  if (!bundle.projectId || !bundle.clientEmail || !bundle.privateKey) {
    throw new Error("Firebase service account JSON is incomplete.");
  }

  let keyHex = env.get("ASOL_MOBILE_PUSH_UNLOCK_KEY")?.trim() ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    keyHex = randomBytes(32).toString("hex");
  }

  const blob = encryptBundle(bundle, keyHex);
  upsertEnvLines(envLocalPath, {
    ASOL_MOBILE_PUSH_UNLOCK_KEY: keyHex,
    ASOL_MOBILE_PUSH_CREDENTIAL_BLOB: blob,
    NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB: blob,
  });

  console.log("Mobile push credentials provisioned in .env.local");
  console.log(`ASOL_MOBILE_PUSH_UNLOCK_KEY=${keyHex}`);
  console.log(`ASOL_MOBILE_PUSH_CREDENTIAL_BLOB length=${blob.length}`);
}

main();
