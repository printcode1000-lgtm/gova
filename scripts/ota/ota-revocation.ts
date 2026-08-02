/** Single responsibility: create a signed revocation document from the tracked version list. */
import { createPublicKey, sign, verify } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  canonicalOtaRevocationPayload,
  isValidOtaRevocationDocument,
  type OtaRevocationDocument,
  type OtaRevocationDocumentPayload,
} from "../../src/features/ota/utils/ota-revocation-document";
import { compareOtaCanonicalStrings } from "../../src/features/ota/utils/ota-canonical-order";

export const OTA_REVOCATIONS_FILE = path.resolve(
  "scripts",
  "ota",
  "ota-revocations.json",
);

export function normalizeRevokedVersions(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("OTA revocations file must contain an array");
  const versions = value.map(String);
  if (versions.some((version) => !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)))
    throw new Error("OTA revocations file contains an invalid version");
  return [...new Set(versions)].sort(compareOtaCanonicalStrings);
}

export function writeTrackedRevokedVersions(versions: readonly string[]): void {
  writeFileSync(
    OTA_REVOCATIONS_FILE,
    `${JSON.stringify(normalizeRevokedVersions([...versions]), null, 2)}\n`,
  );
}

export function mergeRevokedVersions(
  tracked: readonly string[],
  live: readonly string[],
): { merged: string[]; recovered: string[] } {
  const trackedSet = new Set(tracked);
  return {
    merged: normalizeRevokedVersions([...tracked, ...live]),
    recovered: normalizeRevokedVersions(live.filter((version) => !trackedSet.has(version))),
  };
}

export function verifySignedRevocationDocument(
  value: unknown,
  privateKey: string,
): OtaRevocationDocument | null {
  if (!isValidOtaRevocationDocument(value)) return null;
  const { signature, ...payload } = value;
  const valid = verify(
    "sha256",
    Buffer.from(canonicalOtaRevocationPayload(payload)),
    { key: createPublicKey(privateKey), dsaEncoding: "ieee-p1363" },
    Buffer.from(signature, "base64"),
  );
  return valid ? value : null;
}

export function readTrackedRevokedVersions(): string[] {
  return normalizeRevokedVersions(
    JSON.parse(readFileSync(OTA_REVOCATIONS_FILE, "utf8")),
  );
}

export function createSignedRevocationDocument(
  revokedVersions: readonly string[],
  issuedAt: string,
  privateKey: string,
): OtaRevocationDocument {
  const payload: OtaRevocationDocumentPayload = {
    schemaVersion: 1,
    issuedAt,
    revokedVersions: normalizeRevokedVersions([...revokedVersions]),
  };
  const signature = sign(
    "sha256",
    Buffer.from(canonicalOtaRevocationPayload(payload)),
    { key: privateKey, dsaEncoding: "ieee-p1363" },
  ).toString("base64");
  return { ...payload, signature };
}
