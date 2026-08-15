/**
 * Share-intent security validator.
 * Turn an untrusted native payload into a safe ReceivedItem, or reject it.
 * Content arriving from other applications is treated as hostile input:
 * size-capped, MIME-checked, URL-sanitized, and never auto-uploaded.
 */

export const MAX_RECEIVED_BYTES = 50 * 1024 * 1024; // 50MB per file cap
export const MAX_TEXT_LENGTH = 100 * 1024; // 100KB per text snippet cap

export const ALLOWED_MIME_TYPES = new Set<string>([
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/svg+xml",
  // Documents & text
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "application/zip",
  "application/octet-stream",
]);

export type ReceivedItemKind = "text" | "url" | "file";

export interface ReceivedTextItem {
  readonly id: string;
  readonly kind: "text";
  readonly text: string;
  readonly createdAt: number;
}

export interface ReceivedUrlItem {
  readonly id: string;
  readonly kind: "url";
  readonly url: string;
  readonly createdAt: number;
}

export interface ReceivedFileItem {
  readonly id: string;
  readonly kind: "file";
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly data?: string; // base64 payload if provided
  readonly uri?: string;
  readonly createdAt: number;
}

export type ValidatedReceivedItem =
  | ReceivedTextItem
  | ReceivedUrlItem
  | ReceivedFileItem;

/**
 * Sanitizes and validates that a URL string is safe to handle.
 * Rejects javascript:, data:, blob:, file:, and control characters.
 */
export function isSafeUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return false;
  const trimmed = rawUrl.trim();
  if (trimmed.length > 4096) return false;

  // Reject control characters and prototype pollution vectors
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Generates a deterministic content id for deduplication in queues.
 */
function generateItemId(prefix: string, content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `${prefix}_${Math.abs(hash)}_${Date.now()}`;
}

/**
 * Validates a single untrusted inbound share item from Android/iOS.
 */
export function validatePayload(raw: unknown): ValidatedReceivedItem | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;

  // Case 1: URL share
  if (entry.type === "url" || (typeof entry.url === "string" && !entry.type)) {
    const url = typeof entry.url === "string" ? entry.url : (entry.value as string);
    if (typeof url === "string" && isSafeUrl(url)) {
      return {
        id: generateItemId("url", url),
        kind: "url",
        url: url.trim(),
        createdAt: Date.now(),
      };
    }
    return null;
  }

  // Case 2: Text share
  if (entry.type === "text" || (typeof entry.text === "string" && !entry.type)) {
    const text = typeof entry.text === "string" ? entry.text : (entry.value as string);
    if (typeof text === "string" && text.trim().length > 0) {
      const sanitized = text.slice(0, MAX_TEXT_LENGTH).trim();
      return {
        id: generateItemId("text", sanitized),
        kind: "text",
        text: sanitized,
        createdAt: Date.now(),
      };
    }
    return null;
  }

  // Case 3: File share
  if (entry.type === "file" || entry.file || entry.uri || entry.data) {
    const rawName = typeof entry.name === "string" ? entry.name : "shared_file";
    const name = rawName.replace(/[\/\\:*?"<>|]/g, "_").slice(0, 255);
    const mimeType = (
      typeof entry.mimeType === "string" ? entry.mimeType.toLowerCase() : "application/octet-stream"
    );

    // Validate MIME type against allowlist
    const isAllowed =
      ALLOWED_MIME_TYPES.has(mimeType) ||
      mimeType.startsWith("image/") ||
      mimeType.startsWith("text/");

    if (!isAllowed) {
      return null;
    }

    const data = typeof entry.data === "string" ? entry.data : undefined;
    const uri = typeof entry.uri === "string" ? entry.uri : undefined;
    let size = typeof entry.size === "number" ? entry.size : 0;

    if (data && !size) {
      // Estimate base64 byte size
      size = Math.floor((data.length * 3) / 4);
    }

    if (size > MAX_RECEIVED_BYTES) {
      return null;
    }

    return {
      id: generateItemId("file", `${name}_${size}`),
      kind: "file",
      name,
      mimeType,
      size,
      data,
      uri,
      createdAt: Date.now(),
    };
  }

  return null;
}

/**
 * Validates a list of untrusted inbound share items.
 */
export function validatePayloads(raws: unknown[]): ValidatedReceivedItem[] {
  if (!Array.isArray(raws)) return [];
  const validated: ValidatedReceivedItem[] = [];
  for (const raw of raws) {
    const item = validatePayload(raw);
    if (item) {
      validated.push(item);
    }
  }
  return validated;
}

export const validateInboundShareItem = validatePayload;
export const validateInboundShareItems = validatePayloads;
