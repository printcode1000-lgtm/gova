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
 */
export const FORBIDDEN_NOTIFICATION_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export const SECRET_METADATA_KEY_PATTERN =
  /token|secret|password|credential|authorization|cookie|signature|private[_-]?key|api[_-]?key/i;

export const SECRET_METADATA_KEY_EXCEPTIONS_PATTERN =
  /^(?:tokenCount|receivedReceiptSent)$/i;
