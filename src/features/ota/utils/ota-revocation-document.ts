/** Single responsibility: canonicalize and authenticate the compact OTA revocation document. */
export interface OtaRevocationDocumentPayload {
  schemaVersion: 1;
  issuedAt: string;
  revokedVersions: string[];
}

export interface OtaRevocationDocument extends OtaRevocationDocumentPayload {
  signature: string;
}

import { compareOtaCanonicalStrings } from "./ota-canonical-order";
import { isOtaVersion } from "./ota-state";

export function canonicalOtaRevocationPayload(
  payload: OtaRevocationDocumentPayload,
): string {
  return JSON.stringify({
    schemaVersion: payload.schemaVersion,
    issuedAt: payload.issuedAt,
    revokedVersions: [...payload.revokedVersions].sort(compareOtaCanonicalStrings),
  });
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return buffer;
}

export function isValidOtaRevocationDocument(
  value: unknown,
): value is OtaRevocationDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<OtaRevocationDocument>;
  if (
    document.schemaVersion !== 1 ||
    typeof document.issuedAt !== "string" ||
    !Number.isFinite(Date.parse(document.issuedAt)) ||
    typeof document.signature !== "string" ||
    !document.signature ||
    !Array.isArray(document.revokedVersions)
  ) return false;
  const versions = document.revokedVersions;
  if (versions.some((version) => !isOtaVersion(version))) return false;
  return versions.every(
    (version, index) =>
      index === 0 || compareOtaCanonicalStrings(versions[index - 1]!, version) < 0,
  );
}

export async function verifyOtaRevocationDocument(
  value: unknown,
  publicKeyBase64: string,
): Promise<OtaRevocationDocument | null> {
  if (!publicKeyBase64 || !isValidOtaRevocationDocument(value)) return null;
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      decodeBase64(publicKeyBase64),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const { signature, ...payload } = value;
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      decodeBase64(signature),
      new TextEncoder().encode(canonicalOtaRevocationPayload(payload)),
    );
    return valid ? value : null;
  } catch {
    return null;
  }
}
