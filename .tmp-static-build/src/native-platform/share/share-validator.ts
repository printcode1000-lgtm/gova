/**
 * Validation and normalization of incoming shared content.
 *
 * Single responsibility: turn an untrusted native payload into a safe
 * `ReceivedItem`, or reject it. Content arriving from other applications is
 * treated as hostile input: size-capped, MIME-checked, and never auto-uploaded.
 */

import { base64ToBytes } from "../core/binary";
import {
  MAX_RECEIVED_BYTES,
  ReceivedItemKinds,
  type RawSharePayload,
  type ReceivedItem,
  type ReceivedItemKind,
} from "./types";

const IMAGE_MIME = /^image\//i;
const PDF_MIME = /^application\/pdf$/i;
const TEXT_MIME = /^text\//i;

const DOCUMENT_MIME = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
  "application/zip",
];

function classify(mimeType: string): ReceivedItemKind | null {
  if (IMAGE_MIME.test(mimeType)) return ReceivedItemKinds.Image;
  if (PDF_MIME.test(mimeType)) return ReceivedItemKinds.Pdf;
  if (DOCUMENT_MIME.includes(mimeType.toLowerCase())) {
    return ReceivedItemKinds.Document;
  }
  if (TEXT_MIME.test(mimeType)) return ReceivedItemKinds.Text;
  return null;
}

/** Accept only web-navigable URLs; reject javascript:, file:, data:. */
export function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function safeFileName(value: string | undefined, fallbackExt: string): string {
  const raw = (value ?? "").split(/[\\/]/).pop() ?? "";
  const cleaned = raw.replace(/[\0<>:"|?*]/g, "").trim();
  if (!cleaned || cleaned.startsWith(".")) {
    return `shared-${Date.now()}${fallbackExt}`;
  }
  return cleaned.slice(0, 180);
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `shr_${crypto.randomUUID()}`;
  }
  return `shr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Validate one raw payload.
 * @returns A safe item, or `null` when the payload must be discarded.
 */
export function validatePayload(payload: RawSharePayload): ReceivedItem | null {
  const receivedAt = Date.now();
  const declaredType = (payload.type ?? "").toLowerCase();
  const mimeType = payload.mimeType ?? "";

  // Text and URL payloads carry no bytes.
  if (declaredType === "url" || (payload.value && isSafeUrl(payload.value))) {
    const value = payload.value?.trim() ?? "";
    if (!isSafeUrl(value)) return null;
    return {
      id: newId(),
      kind: ReceivedItemKinds.Url,
      value,
      receivedAt,
    };
  }

  if (declaredType === "text" || (!payload.data && payload.value)) {
    const value = payload.value?.trim() ?? "";
    if (!value) return null;
    return {
      id: newId(),
      kind: ReceivedItemKinds.Text,
      // Cap pasted text so a hostile sender cannot exhaust memory.
      value: value.slice(0, 100_000),
      receivedAt,
    };
  }

  if (!payload.data) return null;

  const kind = classify(mimeType);
  if (!kind || kind === ReceivedItemKinds.Text) {
    // A binary payload with an unrecognized MIME type is rejected outright.
    if (!kind) return null;
  }

  let bytes: ReturnType<typeof base64ToBytes>;
  try {
    bytes = base64ToBytes(payload.data);
  } catch {
    return null;
  }

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_RECEIVED_BYTES) {
    return null;
  }

  const extension = mimeType.split("/")[1]?.split("+")[0] ?? "bin";
  const fileName = safeFileName(payload.name, `.${extension}`);

  return {
    id: newId(),
    kind,
    file: new File([bytes], fileName, { type: mimeType }),
    fileName,
    mimeType,
    byteSize: bytes.byteLength,
    receivedAt,
  };
}

/** Validate a batch, dropping every payload that fails. */
export function validatePayloads(payloads: RawSharePayload[]): ReceivedItem[] {
  return payloads
    .map(validatePayload)
    .filter((item): item is ReceivedItem => item !== null);
}
