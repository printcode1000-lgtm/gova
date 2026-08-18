#!/usr/bin/env tsx
/**
 * Build-time helper: encrypt Firebase service-account JSON into the blob
 * embedded in native/static bundles and stored as ASOL_MOBILE_PUSH_CREDENTIAL_BLOB.
 *
 * Usage:
 *   npx tsx scripts/encrypt-mobile-push-credential-blob.ts <unlock-key-hex> <service-account.json>
 */
import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

function main(): void {
  const keyHex = process.argv[2]?.trim() ?? "";
  const sourcePath = process.argv[3]?.trim() ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("Unlock key must be 32 bytes as 64 hex characters.");
  }
  if (!sourcePath) {
    throw new Error("Provide a Firebase service-account JSON path.");
  }

  const parsed = JSON.parse(readFileSync(sourcePath, "utf8")) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  const bundle = {
    projectId: String(parsed.project_id ?? "").trim(),
    clientEmail: String(parsed.client_email ?? "").trim(),
    privateKey: String(parsed.private_key ?? "").trim(),
  };
  if (!bundle.projectId || !bundle.clientEmail || !bundle.privateKey) {
    throw new Error("Service account JSON is missing project_id, client_email, or private_key.");
  }

  const key = Buffer.from(keyHex, "hex");
  const iv = randomBytes(12);
  const enc = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    enc.update(JSON.stringify(bundle), "utf8"),
    enc.final(),
  ]);
  const blob = Buffer.concat([iv, enc.getAuthTag(), ciphertext]).toString("base64");

  console.log("ASOL_MOBILE_PUSH_UNLOCK_KEY=" + keyHex);
  console.log("ASOL_MOBILE_PUSH_CREDENTIAL_BLOB=" + blob);
  console.log("NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB=" + blob);
}

main();
