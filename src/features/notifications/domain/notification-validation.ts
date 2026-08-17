/**
 * What the module refuses to believe.
 *
 * Every value that crosses into the module — a command from a caller, a payload
 * from FCM, a record read back from IndexedDB, a tray notification from the OS,
 * an entry replayed from the retry queue — is checked here before it can reach
 * persistence, navigation, a native plugin, a provider, a log, or the screen.
 *
 * Two strictnesses, and the difference matters:
 *
 * - `assert*` **throws** a `NotificationError`. Used for values a caller in this
 *   codebase supplied: a bug should be loud and fixed at the call site.
 * - `sanitize*` **drops** what it cannot trust and keeps the rest. Used for
 *   anything that arrived from outside the process — a provider, a plugin, a
 *   service worker, a record written by an older version. Throwing there would
 *   turn one malformed key into a lost notification.
 */

import type {
  NotificationEntity,
  NotificationLocale,
  NotificationRoute,
} from "@asol/notifications-core";
import {
  NotificationCategories,
  NotificationChannels,
  NotificationContentSources,
  NotificationDeliveryStatuses,
  NotificationPlatforms,
  NotificationPriorities,
  NotificationSounds,
  NotificationSyncStates,
  NotificationTargets,
  NotificationTypes,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPlatform,
  type NotificationPriority,
  type NotificationSound,
  type NotificationTarget,
} from "@asol/notifications-core";
import {
  NotificationError,
  NotificationErrorCodes,
  invalidField,
  missingField,
} from "./notification-error";
import { REDACTED, isSecretValue, redactEmbeddedSecrets } from "./notification-redaction";

// ---------------------------------------------------------------------------
// Bounds
// ---------------------------------------------------------------------------

export const NOTIFICATION_LIMITS = {
  uid: 128,
  notificationId: 256,
  dedupeKey: 256,
  deviceId: 200,
  phone: 32,
  groupKey: 128,
  title: 300,
  body: 4_000,
  routeHref: 2_048,
  routeLabel: 200,
  tokenMin: 20,
  tokenMax: 8_192,
  metadataKeys: 60,
  metadataKeyLength: 64,
  metadataValueLength: 2_048,
  /** Serialized metadata ceiling. FCM's own data limit is 4 KB. */
  metadataBytes: 8_192,
  channels: 8,
  targets: 16,
} as const;

/**
 * Keys that must never be written onto an object built from untrusted input.
 *
 * A payload carrying `__proto__` reaches `Object.prototype` through a spread or
 * an index assignment, which is a prototype-pollution primitive, not a typo.
 */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Control characters, tested by code point rather than by a regular expression
 * so that no literal control byte ever appears in this source file.
 */
function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** The sanitizing counterpart: a control character becomes a space. */
function stripControlCharacters(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    output += code < 0x20 || code === 0x7f ? " " : value.charAt(index);
  }
  return output;
}



// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

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
  // Deliberately permissive: the authoritative check is server-side against the
  // stored user. This only stops something structurally impossible.
  if (phone && !/^[+0-9 ()-]+$/.test(phone)) {
    throw invalidField(field, "must contain only digits and phone punctuation");
  }
  return phone;
}

export function assertDeviceToken(value: unknown, field = "token"): string {
  const token = assertString(value, field, NOTIFICATION_LIMITS.tokenMax, {
    min: NOTIFICATION_LIMITS.tokenMin,
  });
  return token;
}

export function assertLocale(value: unknown, field = "locale"): NotificationLocale {
  if (value === "ar" || value === "en") return value;
  throw new NotificationError(
    NotificationErrorCodes.UnsupportedValue,
    `${field} must be "ar" or "en".`,
    { field },
  );
}

export function assertOptionalLocale(
  value: unknown,
  field = "locale",
): NotificationLocale | undefined {
  return value === undefined || value === null ? undefined : assertLocale(value, field);
}

/** ISO-8601, parseable, and not absurdly far from now. */
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

function enumAssert<T extends string>(
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

export const assertCategory = enumAssert(
  Object.values(NotificationCategories) as NotificationCategory[],
  "category",
);
export const assertPriority = enumAssert(
  Object.values(NotificationPriorities) as NotificationPriority[],
  "priority",
);
export const assertSound = enumAssert(
  Object.values(NotificationSounds) as NotificationSound[],
  "sound",
);
export const assertPlatform = enumAssert(
  Object.values(NotificationPlatforms) as NotificationPlatform[],
  "platform",
);

export function assertChannels(value: unknown, field = "channels"): NotificationChannel[] {
  return assertEnumArray(
    value,
    field,
    Object.values(NotificationChannels) as NotificationChannel[],
    NOTIFICATION_LIMITS.channels,
  );
}

export function assertTargets(value: unknown, field = "targets"): NotificationTarget[] {
  return assertEnumArray(
    value,
    field,
    Object.values(NotificationTargets) as NotificationTarget[],
    NOTIFICATION_LIMITS.targets,
  );
}

function assertEnumArray<T extends string>(
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

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * Whether a deep link may be navigated to.
 *
 * Only same-origin absolute paths. A notification is attacker-influenced input
 * on every platform — anyone who can get a push accepted can choose this
 * string — so `javascript:`, `data:`, a protocol-relative `//evil.test`, and a
 * backslash-escaped variant all have to be impossible, not merely unlikely.
 */
export function isSafeInternalRoute(href: unknown): href is string {
  if (typeof href !== "string") return false;
  const value = href.trim();
  if (!value || value.length > NOTIFICATION_LIMITS.routeHref) return false;
  if (hasControlCharacters(value)) return false;
  if (!value.startsWith("/")) return false;
  // `//host` is protocol-relative; `/\host` and `/\/host` are the browser's
  // backslash-tolerant spellings of the same thing.
  if (/^\/[\\/]/.test(value)) return false;
  if (value.includes("\\")) return false;
  // A scheme cannot appear in a path that starts with `/`, but an encoded one
  // can survive a later `decodeURIComponent` before navigation.
  if (/%2f%2f/i.test(value)) return false;
  if (/\.\.(?:\/|$)/.test(value)) return false;
  return true;
}

export function assertRoute(value: unknown, field = "route"): NotificationRoute | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") throw invalidField(field, "must be an object");
  const candidate = value as { href?: unknown; label?: unknown };
  if (!isSafeInternalRoute(candidate.href)) {
    throw new NotificationError(
      NotificationErrorCodes.UnsafeRoute,
      `${field}.href must be a safe internal path beginning with "/".`,
      { field: `${field}.href` },
    );
  }
  const label = assertOptionalString(
    candidate.label,
    `${field}.label`,
    NOTIFICATION_LIMITS.routeLabel,
  );
  return { href: candidate.href.trim(), ...(label ? { label } : {}) };
}

/** The untrusted counterpart: an unsafe route is dropped, not fatal. */
export function sanitizeRoute(value: unknown): NotificationRoute | undefined {
  try {
    return assertRoute(value);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export type NotificationMetadata = NonNullable<NotificationEntity["metadata"]>;

function isAllowedMetadataValue(value: unknown): value is string | number | boolean | null {
  if (value === null) return true;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && value.length <= NOTIFICATION_LIMITS.metadataValueLength;
}

/**
 * Key names whose value must never be persisted, whatever the value looks like.
 *
 * Notification metadata is written to IndexedDB and rendered in the centre, so
 * anything that lands here is durable and visible. A sender — including one this
 * codebase does not control — putting a session token in `meta_sessionToken`
 * would otherwise leave a live credential on disk.
 */
const SECRET_METADATA_KEY = /token|secret|password|credential|authorization|cookie|signature|private[_-]?key|api[_-]?key/i;

/** Keys that match the pattern above but are counts or flags, not secrets. */
const SECRET_METADATA_KEY_EXCEPTIONS = /^(?:tokenCount|receivedReceiptSent)$/i;

/**
 * Strip a secret out of one metadata entry.
 *
 * Redacted rather than dropped: the key's presence is often the meaningful part
 * — the centre may branch on whether a receipt carried one — and losing the key
 * silently changes behaviour, while losing the value cannot.
 */
function redactMetadataValue(
  key: string,
  value: string | number | boolean | null,
): string | number | boolean | null {
  if (typeof value !== "string") return value;
  if (SECRET_METADATA_KEY.test(key) && !SECRET_METADATA_KEY_EXCEPTIONS.test(key)) {
    return REDACTED;
  }
  if (isSecretValue(value)) return REDACTED;
  return redactEmbeddedSecrets(value);
}

/**
 * Caller-supplied metadata. Flat by contract — the stored shape is
 * `Record<string, string | number | boolean | null>` — so a nested object here
 * is a mistake at the call site rather than something to quietly flatten.
 */
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
    if (FORBIDDEN_KEYS.has(key)) {
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
  // Rebuilt as an ordinary object so consumers can spread it; the prototype-less
  // accumulator above is only there to make a forbidden key unassignable.
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

/**
 * Untrusted metadata: keep what is usable, drop what is not.
 *
 * A push from a provider or a record written by an older client is not a bug in
 * this codebase, and one unusable key must not cost the user the notification.
 */
export function sanitizeMetadata(value: unknown): NotificationMetadata | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;

  const output: Record<string, string | number | boolean | null> = {};
  let count = 0;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (count >= NOTIFICATION_LIMITS.metadataKeys) break;
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (!key || key.length > NOTIFICATION_LIMITS.metadataKeyLength) continue;
    const entry = (value as Record<string, unknown>)[key];
    if (isAllowedMetadataValue(entry)) {
      output[key] = redactMetadataValue(key, entry);
      count += 1;
      continue;
    }
    // A nested value is not dropped silently when it can be represented: the
    // native bridge flattens objects to strings, and losing it would lose the
    // deep link or the receipt target it carries.
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

// ---------------------------------------------------------------------------
// Whole notifications
// ---------------------------------------------------------------------------

/**
 * A notification a caller in this codebase built. Throws on anything wrong, and
 * returns a normalized copy — trimmed text, deduplicated channels and targets,
 * canonical timestamps — so what reaches storage is exactly what was checked.
 */
export function assertNotificationEntity(
  value: unknown,
  field = "notification",
): NotificationEntity {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidField(field, "must be an object");
  }
  const input = value as Record<string, unknown>;
  const now = new Date().toISOString();

  const type = enumAssert(Object.values(NotificationTypes), `${field}.type`)(input.type);
  const source = enumAssert(
    Object.values(NotificationContentSources),
    `${field}.source`,
  )(input.source);
  const status = enumAssert(
    Object.values(NotificationDeliveryStatuses),
    `${field}.status`,
  )(input.status);
  const syncState = enumAssert(
    Object.values(NotificationSyncStates),
    `${field}.syncState`,
  )(input.syncState);

  const entity: NotificationEntity = {
    id: assertNotificationId(input.id, `${field}.id`),
    uid: assertUid(input.uid, `${field}.uid`),
    type,
    source,
    templateId: assertOptionalString(input.templateId, `${field}.templateId`, 128),
    eventName: assertOptionalString(input.eventName, `${field}.eventName`, 128),
    // Title and body may legitimately be empty on a data-only delivery, so the
    // minimum is zero here and emptiness is judged by the visibility rule.
    title: assertOptionalString(input.title, `${field}.title`, NOTIFICATION_LIMITS.title) ?? "",
    body: assertOptionalString(input.body, `${field}.body`, NOTIFICATION_LIMITS.body) ?? "",
    category: assertCategory(input.category),
    priority: assertPriority(input.priority),
    channels: assertChannels(input.channels, `${field}.channels`),
    targets: assertTargets(input.targets, `${field}.targets`),
    route: assertRoute(input.route, `${field}.route`),
    groupKey: assertOptionalString(input.groupKey, `${field}.groupKey`, NOTIFICATION_LIMITS.groupKey),
    dedupeKey: assertDedupeKey(input.dedupeKey, `${field}.dedupeKey`),
    sound: assertSound(input.sound),
    status,
    syncState,
    readAt: input.readAt === undefined ? undefined : assertTimestamp(input.readAt, `${field}.readAt`),
    displayedAt:
      input.displayedAt === undefined
        ? undefined
        : assertTimestamp(input.displayedAt, `${field}.displayedAt`),
    openedAt:
      input.openedAt === undefined ? undefined : assertTimestamp(input.openedAt, `${field}.openedAt`),
    dismissedAt:
      input.dismissedAt === undefined
        ? undefined
        : assertTimestamp(input.dismissedAt, `${field}.dismissedAt`),
    createdAt: input.createdAt === undefined ? now : assertTimestamp(input.createdAt, `${field}.createdAt`),
    updatedAt: input.updatedAt === undefined ? now : assertTimestamp(input.updatedAt, `${field}.updatedAt`),
    metadata: assertMetadata(input.metadata, `${field}.metadata`),
  };
  return entity;
}

/**
 * A notification that came from outside: a provider payload already mapped by an
 * adapter, a record read back from storage, a service-worker copy.
 *
 * Returns `null` rather than throwing when the record cannot be repaired into
 * something safe. A record missing a `uid`, an `id`, or a `dedupeKey` has no
 * identity and cannot be stored or deduplicated, so there is nothing to keep.
 */
export function sanitizeNotificationEntity(value: unknown): NotificationEntity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;

  const id = typeof input.id === "string" ? input.id.trim().slice(0, NOTIFICATION_LIMITS.notificationId) : "";
  const uid = typeof input.uid === "string" ? input.uid.trim().slice(0, NOTIFICATION_LIMITS.uid) : "";
  if (!id || !uid) return null;

  const dedupeKey =
    typeof input.dedupeKey === "string" && input.dedupeKey.trim()
      ? input.dedupeKey.trim().slice(0, NOTIFICATION_LIMITS.dedupeKey)
      : id;

  const oneOf = <T extends string>(candidate: unknown, allowed: readonly T[], fallback: T): T =>
    typeof candidate === "string" && (allowed as readonly string[]).includes(candidate)
      ? (candidate as T)
      : fallback;

  const timestamp = (candidate: unknown, fallback: string): string => {
    if (typeof candidate !== "string") return fallback;
    const parsed = Date.parse(candidate);
    if (Number.isNaN(parsed)) return fallback;
    const year = new Date(parsed).getUTCFullYear();
    if (year < 2000 || year > 2200) return fallback;
    return new Date(parsed).toISOString();
  };

  const optionalTimestamp = (candidate: unknown): string | undefined => {
    if (typeof candidate !== "string") return undefined;
    const parsed = Date.parse(candidate);
    if (Number.isNaN(parsed)) return undefined;
    const year = new Date(parsed).getUTCFullYear();
    return year < 2000 || year > 2200 ? undefined : new Date(parsed).toISOString();
  };

  const text = (candidate: unknown, max: number): string =>
    typeof candidate === "string"
      ? stripControlCharacters(candidate).trim().slice(0, max)
      : "";

  const enumArray = <T extends string>(
    candidate: unknown,
    allowed: readonly T[],
    fallback: T[],
    max: number,
  ): T[] => {
    if (!Array.isArray(candidate)) return fallback;
    const kept = [
      ...new Set(
        candidate.filter(
          (entry): entry is T =>
            typeof entry === "string" && (allowed as readonly string[]).includes(entry),
        ),
      ),
    ].slice(0, max);
    return kept.length > 0 ? kept : fallback;
  };

  const now = new Date().toISOString();
  return {
    id,
    uid,
    type: oneOf(input.type, Object.values(NotificationTypes), NotificationTypes.Custom),
    source: oneOf(
      input.source,
      Object.values(NotificationContentSources),
      NotificationContentSources.Custom,
    ),
    templateId: text(input.templateId, 128) || undefined,
    eventName: text(input.eventName, 128) || undefined,
    title: text(input.title, NOTIFICATION_LIMITS.title),
    body: text(input.body, NOTIFICATION_LIMITS.body),
    category: oneOf(
      input.category,
      Object.values(NotificationCategories),
      NotificationCategories.System,
    ),
    priority: oneOf(
      input.priority,
      Object.values(NotificationPriorities),
      NotificationPriorities.Normal,
    ),
    channels: enumArray(
      input.channels,
      Object.values(NotificationChannels),
      [NotificationChannels.InApp],
      NOTIFICATION_LIMITS.channels,
    ),
    targets: enumArray(
      input.targets,
      Object.values(NotificationTargets),
      [NotificationTargets.Center, NotificationTargets.Badge],
      NOTIFICATION_LIMITS.targets,
    ),
    route: sanitizeRoute(input.route),
    groupKey: text(input.groupKey, NOTIFICATION_LIMITS.groupKey) || undefined,
    dedupeKey,
    sound: oneOf(input.sound, Object.values(NotificationSounds), NotificationSounds.Default),
    status: oneOf(
      input.status,
      Object.values(NotificationDeliveryStatuses),
      NotificationDeliveryStatuses.Delivered,
    ),
    syncState: oneOf(
      input.syncState,
      Object.values(NotificationSyncStates),
      NotificationSyncStates.Synced,
    ),
    readAt: optionalTimestamp(input.readAt),
    displayedAt: optionalTimestamp(input.displayedAt),
    openedAt: optionalTimestamp(input.openedAt),
    dismissedAt: optionalTimestamp(input.dismissedAt),
    createdAt: timestamp(input.createdAt, now),
    updatedAt: timestamp(input.updatedAt, now),
    metadata: sanitizeMetadata(input.metadata),
  };
}

// ---------------------------------------------------------------------------
// Retry queue
// ---------------------------------------------------------------------------

export const RETRY_OPERATION_KINDS = [
  "analytics",
  "device_token",
  "settings",
  "chat_receipt",
] as const;

export type RetryOperationKind = (typeof RETRY_OPERATION_KINDS)[number];

export function assertRetryKind(value: unknown, field = "kind"): RetryOperationKind {
  return enumAssert(RETRY_OPERATION_KINDS, field)(value);
}

/**
 * A queued operation read back from storage.
 *
 * `payload` stays `unknown` on purpose: only the extension that enqueued it
 * knows its shape, and this layer must not pretend to. What is checked is the
 * envelope — identity, kind, attempt count — which is what the queue itself
 * acts on.
 */
export function sanitizeRetryOperation(value: unknown): {
  id: string;
  uid: string;
  kind: RetryOperationKind;
  payload: unknown;
  attempts: number;
  createdAt: string;
  updatedAt: string;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const id = typeof input.id === "string" ? input.id.trim().slice(0, 256) : "";
  const uid = typeof input.uid === "string" ? input.uid.trim().slice(0, NOTIFICATION_LIMITS.uid) : "";
  if (!id || !uid) return null;
  if (
    typeof input.kind !== "string" ||
    !(RETRY_OPERATION_KINDS as readonly string[]).includes(input.kind)
  ) {
    return null;
  }
  const attempts =
    typeof input.attempts === "number" && Number.isInteger(input.attempts) && input.attempts >= 0
      ? Math.min(input.attempts, 1_000)
      : 0;
  const now = new Date().toISOString();
  const when = (candidate: unknown): string =>
    typeof candidate === "string" && !Number.isNaN(Date.parse(candidate))
      ? new Date(candidate).toISOString()
      : now;
  return {
    id,
    uid,
    kind: input.kind as RetryOperationKind,
    payload: input.payload,
    attempts,
    createdAt: when(input.createdAt),
    updatedAt: when(input.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// Extensions
// ---------------------------------------------------------------------------

export function assertExtensionRegistration(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw invalidField("extension", "must be an object");
  }
  const extension = value as Record<string, unknown>;
  assertString(extension.id, "extension.id", 64);
  for (const hook of ["reconcile", "onRead", "replayQueuedOperation"] as const) {
    const handler = extension[hook];
    if (handler !== undefined && typeof handler !== "function") {
      throw invalidField(`extension.${hook}`, "must be a function when present");
    }
  }
}
