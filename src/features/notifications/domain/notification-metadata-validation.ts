import type { NotificationEntity } from "@asol/notifications-core";

import {
  NotificationError,
  NotificationErrorCodes,
  invalidField,
} from "./notification-error";
import { REDACTED, isSecretValue, redactEmbeddedSecrets } from "./notification-redaction";
import {
  FORBIDDEN_NOTIFICATION_OBJECT_KEYS,
  NOTIFICATION_LIMITS,
  SECRET_METADATA_KEY_EXCEPTIONS_PATTERN,
  SECRET_METADATA_KEY_PATTERN,
} from "./notification-validation-constants";

export type NotificationMetadata = NonNullable<NotificationEntity["metadata"]>;

function isAllowedMetadataValue(value: unknown): value is string | number | boolean | null {
  if (value === null) return true;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.length <= NOTIFICATION_LIMITS.metadataValueLength;
}

function redactMetadataValue(
  key: string,
  value: string | number | boolean | null,
): string | number | boolean | null {
  if (typeof value !== "string") return value;
  if (
    SECRET_METADATA_KEY_PATTERN.test(key) &&
    !SECRET_METADATA_KEY_EXCEPTIONS_PATTERN.test(key)
  ) {
    return REDACTED;
  }
  if (isSecretValue(value)) return REDACTED;
  return redactEmbeddedSecrets(value);
}

export function assertMetadata(
  value: unknown,
  field = "metadata",
): NotificationMetadata | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw invalidField(field, "must be a flat object");
  }
  const keys = Object.keys(value as Record<string, unknown>);
  if (keys.length > NOTIFICATION_LIMITS.metadataKeys) {
    throw new NotificationError(
      NotificationErrorCodes.InvalidMetadata,
      `${field} must have at most ${NOTIFICATION_LIMITS.metadataKeys} keys.`,
      { field, context: { keys: keys.length } },
    );
  }

  const output: NotificationMetadata = Object.create(null) as NotificationMetadata;
  for (const key of keys) {
    if (FORBIDDEN_NOTIFICATION_OBJECT_KEYS.has(key)) {
      throw new NotificationError(
        NotificationErrorCodes.InvalidMetadata,
        `${field} must not contain the key "${key}".`,
        { field: `${field}.${key}` },
      );
    }
    if (!key || key.length > NOTIFICATION_LIMITS.metadataKeyLength) {
      throw new NotificationError(
        NotificationErrorCodes.InvalidMetadata,
        `${field} keys must be 1-${NOTIFICATION_LIMITS.metadataKeyLength} characters.`,
        { field },
      );
    }
    const entry = (value as Record<string, unknown>)[key];
    if (!isAllowedMetadataValue(entry)) {
      throw new NotificationError(
        NotificationErrorCodes.InvalidMetadata,
        `${field}.${key} must be a string, finite number, boolean, or null.`,
        { field: `${field}.${key}` },
      );
    }
    output[key] = redactMetadataValue(key, entry);
  }

  assertMetadataSize(output, field);
  return { ...output };
}

function assertMetadataSize(metadata: NotificationMetadata, field: string): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(metadata) ?? "";
  } catch {
    throw new NotificationError(
      NotificationErrorCodes.InvalidMetadata,
      `${field} must be serializable.`,
      { field },
    );
  }
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > NOTIFICATION_LIMITS.metadataBytes) {
    throw new NotificationError(
      NotificationErrorCodes.InvalidMetadata,
      `${field} must serialize to at most ${NOTIFICATION_LIMITS.metadataBytes} bytes.`,
      { field, context: { bytes } },
    );
  }
}

export function sanitizeMetadata(value: unknown): NotificationMetadata | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;

  const output: Record<string, string | number | boolean | null> = {};
  let count = 0;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (count >= NOTIFICATION_LIMITS.metadataKeys) break;
    if (FORBIDDEN_NOTIFICATION_OBJECT_KEYS.has(key)) continue;
    if (!key || key.length > NOTIFICATION_LIMITS.metadataKeyLength) continue;
    const entry = (value as Record<string, unknown>)[key];
    if (isAllowedMetadataValue(entry)) {
      output[key] = redactMetadataValue(key, entry);
      count += 1;
      continue;
    }
    if (typeof entry === "object" && entry !== null) {
      try {
        const text = JSON.stringify(entry);
        if (text && text.length <= NOTIFICATION_LIMITS.metadataValueLength) {
          output[key] = text;
          count += 1;
        }
      } catch {
        /* unrepresentable: drop it */
      }
    }
  }

  if (count === 0) return undefined;
  try {
    if (Buffer.byteLength(JSON.stringify(output), "utf8") > NOTIFICATION_LIMITS.metadataBytes) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return output;
}
