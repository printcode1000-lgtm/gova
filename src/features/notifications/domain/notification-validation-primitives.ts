import {
  NotificationError,
  NotificationErrorCodes,
  invalidField,
  missingField,
} from "./notification-error";
import { NOTIFICATION_LIMITS } from "./notification-validation-constants";

export function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function stripControlCharacters(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    output += code < 0x20 || code === 0x7f ? " " : value.charAt(index);
  }
  return output;
}

function isPlainString(value: unknown): value is string {
  return typeof value === "string";
}

export function assertString(
  value: unknown,
  field: string,
  max: number,
  { min = 1 }: { min?: number } = {},
): string {
  if (value === undefined || value === null) throw missingField(field);
  if (!isPlainString(value)) throw invalidField(field, "must be a string");
  const trimmed = value.trim();
  if (trimmed.length < min) throw missingField(field);
  if (trimmed.length > max) {
    throw invalidField(field, `must be at most ${max} characters`, {
      length: trimmed.length,
    });
  }
  if (hasControlCharacters(trimmed)) {
    throw invalidField(field, "must not contain control characters");
  }
  return trimmed;
}

export function assertOptionalString(
  value: unknown,
  field: string,
  max: number,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return assertString(value, field, max);
}

export function assertUid(value: unknown, field = "uid"): string {
  return assertString(value, field, NOTIFICATION_LIMITS.uid);
}

export function assertNotificationId(value: unknown, field = "notificationId"): string {
  return assertString(value, field, NOTIFICATION_LIMITS.notificationId);
}

export function assertDedupeKey(value: unknown, field = "dedupeKey"): string {
  return assertString(value, field, NOTIFICATION_LIMITS.dedupeKey);
}

export function assertPhone(value: unknown, field = "phone"): string {
  const phone = assertOptionalString(value, field, NOTIFICATION_LIMITS.phone) ?? "";
  if (phone && !/^[+0-9 ()-]+$/.test(phone)) {
    throw invalidField(field, "must contain only digits and phone punctuation");
  }
  return phone;
}

export function assertDeviceToken(value: unknown, field = "token"): string {
  return assertString(value, field, NOTIFICATION_LIMITS.tokenMax, {
    min: NOTIFICATION_LIMITS.tokenMin,
  });
}

export function assertLocale<TLocale extends string>(
  value: unknown,
  field = "locale",
): TLocale {
  if (value === "ar" || value === "en") return value as TLocale;
  throw new NotificationError(
    NotificationErrorCodes.UnsupportedValue,
    `${field} must be "ar" or "en".`,
    { field },
  );
}

export function assertOptionalLocale<TLocale extends string>(
  value: unknown,
  field = "locale",
): TLocale | undefined {
  return value === undefined || value === null ? undefined : assertLocale<TLocale>(value, field);
}

export function assertTimestamp(value: unknown, field: string): string {
  const text = assertString(value, field, 64);
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) throw invalidField(field, "must be an ISO-8601 timestamp");
  const year = new Date(parsed).getUTCFullYear();
  if (year < 2000 || year > 2200) {
    throw invalidField(field, "must be a plausible date", { year });
  }
  return new Date(parsed).toISOString();
}

export function enumAssert<T extends string>(
  values: readonly T[],
  field: string,
): (value: unknown) => T {
  return (value: unknown): T => {
    if (typeof value === "string" && (values as readonly string[]).includes(value)) {
      return value as T;
    }
    throw new NotificationError(
      NotificationErrorCodes.UnsupportedValue,
      `${field} must be one of: ${values.join(", ")}.`,
      { field },
    );
  };
}

export function assertEnumArray<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  max: number,
): T[] {
  if (!Array.isArray(value)) throw invalidField(field, "must be an array");
  if (value.length > max) throw invalidField(field, `must have at most ${max} entries`);
  const seen = new Set<T>();
  for (const entry of value) {
    if (typeof entry !== "string" || !(allowed as readonly string[]).includes(entry)) {
      throw new NotificationError(
        NotificationErrorCodes.UnsupportedValue,
        `${field} contains an unsupported value.`,
        { field },
      );
    }
    seen.add(entry as T);
  }
  return [...seen];
}
