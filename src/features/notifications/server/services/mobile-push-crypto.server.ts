import "server-only";

import { createDecipheriv } from "node:crypto";
import {
  getMobilePushUnlockKeyBuffer,
  isMobilePushUnlockConfigured,
} from "@/core/config/server-env";

export interface MobilePushCredentialBundle {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export { isMobilePushUnlockConfigured };

/**
 * Decrypts the embedded mobile push credential blob (AES-256-GCM).
 * Format: base64(iv[12] + authTag[16] + ciphertext)
 */
export function decryptMobilePushCredentialBlob(
  blobBase64: string,
): MobilePushCredentialBundle {
  const key = getMobilePushUnlockKeyBuffer();
  if (!key) throw new Error("mobilePushUnlockNotConfigured");

  const packed = Buffer.from(blobBase64, "base64");
  if (packed.length < 28) throw new Error("mobilePushCredentialBlobInvalid");

  const iv = packed.subarray(0, 12);
  const authTag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  const parsed = JSON.parse(plaintext) as Partial<MobilePushCredentialBundle>;
  const projectId = String(parsed.projectId ?? "").trim();
  const clientEmail = String(parsed.clientEmail ?? "").trim();
  const privateKey = String(parsed.privateKey ?? "").trim();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("mobilePushCredentialBlobInvalid");
  }
  return { projectId, clientEmail, privateKey };
}
