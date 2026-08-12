/**
 * One place that decides what must never be written down.
 *
 * Everything the module logs, persists as metadata, reports as diagnostics, or
 * puts in an error passes through here first. Two independent rules, because
 * either alone misses real cases:
 *
 * 1. **By key.** `sessionToken`, `authorization`, `vapid…` — the name says it is
 *    a secret regardless of what the value looks like.
 * 2. **By value shape.** A JWT, a bearer header, an APNs token, a serialized
 *    `PushSubscription` — a provider can hand these back under any key it likes,
 *    including one we have never seen.
 *
 * Redaction is lossy on purpose: it keeps a length and a kind so a bug is still
 * diagnosable, and drops the value.
 */

export const REDACTED = "[redacted]";

/** Key names whose value is always a secret, matched case-insensitively. */
const SECRET_KEY_PATTERNS: readonly RegExp[] = [
  /token/i,
  /secret/i,
  /password/i,
  /passwd/i,
  /credential/i,
  /authorization/i,
  /^auth$/i,
  /cookie/i,
  /session/i,
  /vapid/i,
  /private[_-]?key/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /signature/i,
  /\bgrant/i,
  /subscription/i,
  /endpoint/i,
  /\bkeys?\b/i,
  /bearer/i,
  /service[_-]?account/i,
  /client[_-]?secret/i,
];

/**
 * Key names that survive the patterns above because they are not secrets.
 *
 * Without this, ordinary fields the notification centre needs — a count of
 * tokens, whether a grant was issued — would be redacted into uselessness.
 */
const SECRET_KEY_EXCEPTIONS: readonly RegExp[] = [
  /^tokenCount$/i,
  /^deviceTokenCount$/i,
  /^grantedUsers$/i,
  /^notificationGrantDelivery$/i,
  /^sessionTokenPresent$/i,
];

/**
 * Value shapes that are secrets whatever key they arrive under, when the value
 * *is* the secret.
 */
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  // JWT / signed grant: three base64url segments.
  /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/,
  // Authorization header value.
  /^(?:Bearer|Basic|Digest)\s+\S+/i,
  // A raw 64-hex APNs device token.
  /^[0-9a-f]{64}$/i,
  // A serialized Web Push subscription.
  /"endpoint"\s*:\s*"https?:\/\//,
  // PEM private key material.
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  // A Google service-account blob.
  /"private_key"\s*:/,
  // An FCM registration token: long, with the colon Firebase puts in.
  /^[A-Za-z0-9_-]{10,}:APA91[A-Za-z0-9_-]{20,}$/,
];

/**
 * The same secrets, matched *inside* a longer string.
 *
 * This is the case that actually bites: a provider does not hand back a bare
 * token, it hands back `FCM rejected {"authorization":"Bearer ya29…"}` and that
 * whole sentence becomes an error message. Whole-value matching sees a harmless
 * sentence; these patterns see the credential in it and cut it out.
 */
const EMBEDDED_SECRET_PATTERNS: readonly RegExp[] = [
  /(?:Bearer|Basic|Digest)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\b[A-Za-z0-9_-]{10,}:APA91[A-Za-z0-9_-]{20,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\bya29\.[A-Za-z0-9._-]{10,}/g,
  /\b[0-9a-f]{64}\b/gi,
  /"(?:token|secret|password|authorization|private_key|sessionToken)"\s*:\s*"[^"]*"/gi,
];

/** Cut every embedded credential out of a string, keeping the rest readable. */
export function redactEmbeddedSecrets(value: string): string {
  let output = value;
  for (const pattern of EMBEDDED_SECRET_PATTERNS) {
    output = output.replace(new RegExp(pattern.source, pattern.flags), REDACTED);
  }
  return output;
}

/** Bounds, so a hostile payload cannot make redaction itself expensive. */
const MAX_DEPTH = 6;
const MAX_KEYS_PER_OBJECT = 100;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 512;

function isSecretKey(key: string): boolean {
  if (SECRET_KEY_EXCEPTIONS.some((pattern) => pattern.test(key))) return false;
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function isSecretValue(value: string): boolean {
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/** What replaces a secret: enough to debug with, nothing to authenticate with. */
function redactedMarker(value: string): string {
  return `${REDACTED}:${value.length}`;
}

function redactString(value: string): string {
  if (isSecretValue(value)) return redactedMarker(value);
  const cleaned = redactEmbeddedSecrets(value);
  return cleaned.length > MAX_STRING_LENGTH
    ? `${cleaned.slice(0, MAX_STRING_LENGTH)}…[truncated:${cleaned.length}]`
    : cleaned;
}

/**
 * Deep-redact any value for logging, diagnostics, or an error context.
 *
 * Cycles, getters that throw, and hostile depth are all handled: this runs on
 * data that came from a provider or a native plugin, so it cannot assume the
 * input is well behaved.
 */
export function redactSecrets(input: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return redactString(input);
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (typeof input === "bigint") return `${input.toString()}n`;
  if (typeof input === "function" || typeof input === "symbol") return `[${typeof input}]`;
  if (depth >= MAX_DEPTH) return "[depth-limit]";

  if (input instanceof Error) {
    return { name: input.name, message: redactString(input.message) };
  }

  if (typeof input === "object") {
    if (seen.has(input)) return "[circular]";
    seen.add(input);

    if (Array.isArray(input)) {
      const items = input.slice(0, MAX_ARRAY_ITEMS).map((item) => redactSecrets(item, depth + 1, seen));
      if (input.length > MAX_ARRAY_ITEMS) items.push(`[+${input.length - MAX_ARRAY_ITEMS} more]`);
      return items;
    }

    const output: Record<string, unknown> = {};
    let count = 0;
    for (const key of Object.keys(input as Record<string, unknown>)) {
      if (count >= MAX_KEYS_PER_OBJECT) {
        output["[truncated]"] = true;
        break;
      }
      count += 1;
      let value: unknown;
      try {
        value = (input as Record<string, unknown>)[key];
      } catch {
        output[key] = "[unreadable]";
        continue;
      }
      output[key] = isSecretKey(key)
        ? typeof value === "string"
          ? redactedMarker(value)
          : REDACTED
        : redactSecrets(value, depth + 1, seen);
    }
    return output;
  }

  return String(input);
}

/**
 * The module's only logger.
 *
 * Console calls scattered through adapters were the easiest way for a raw
 * provider error to reach a log aggregator, so they all come here and every
 * argument is redacted on the way through.
 */
export const notificationLog = {
  warn(message: string, details?: unknown): void {
    if (details === undefined) console.warn(`[Notifications] ${message}`);
    else console.warn(`[Notifications] ${message}`, redactSecrets(details));
  },
  error(message: string, details?: unknown): void {
    if (details === undefined) console.error(`[Notifications] ${message}`);
    else console.error(`[Notifications] ${message}`, redactSecrets(details));
  },
};
