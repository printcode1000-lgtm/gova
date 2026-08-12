/**
 * The one error type the notification module throws across its public boundary.
 *
 * Callers get a stable machine-readable `code` and a short human message that
 * names *what* was wrong, never *what the value was*. That rule is the whole
 * point: a rejected device token, a bad grant, or a provider error body would
 * otherwise put a live credential into a log line, a toast, or a bug report.
 * Anything caller-supplied that helps diagnosis goes through `field` and the
 * redactor — see `notification-redaction.ts`.
 */

export const NotificationErrorCodes = {
  /** The command's `type` is not one this module implements. */
  UnknownCommand: "notifications/unknown-command",
  /** The command's payload is missing, or is not an object. */
  InvalidCommandPayload: "notifications/invalid-command-payload",
  /** A required field was absent or empty. */
  MissingField: "notifications/missing-field",
  /** A field was present but not the expected shape, type, or length. */
  InvalidField: "notifications/invalid-field",
  /** A field's value is not one of the supported enum members. */
  UnsupportedValue: "notifications/unsupported-value",
  /** A deep link that is not a safe internal route. */
  UnsafeRoute: "notifications/unsafe-route",
  /** Metadata that is too large, too deep, or carries a forbidden key. */
  InvalidMetadata: "notifications/invalid-metadata",
  /** A stored or inbound record could not be trusted and was rejected. */
  InvalidRecord: "notifications/invalid-record",
  /** A permission the operation needed was not granted. */
  PermissionDenied: "notifications/permission-denied",
  /** The platform cannot do this — no plugin, no transport, no secure context. */
  Unsupported: "notifications/unsupported-platform",
  /** A transport or provider refused the operation. */
  DeliveryFailed: "notifications/delivery-failed",
} as const;

export type NotificationErrorCode =
  (typeof NotificationErrorCodes)[keyof typeof NotificationErrorCodes];

export interface NotificationErrorDetails {
  /** Dotted path of the offending field, e.g. `payload.metadata.orderId`. */
  field?: string;
  /** Redacted, bounded context. Never a raw payload. */
  context?: Record<string, string | number | boolean>;
  cause?: unknown;
}

export class NotificationError extends Error {
  readonly code: NotificationErrorCode;
  readonly field?: string;
  readonly context?: Record<string, string | number | boolean>;

  constructor(
    code: NotificationErrorCode,
    message: string,
    details: NotificationErrorDetails = {},
  ) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = "NotificationError";
    this.code = code;
    this.field = details.field;
    this.context = details.context;
  }

  /**
   * What may cross a process boundary: a response body, a log line, a toast.
   *
   * Deliberately not `toString()` of the cause — a provider's rejection body is
   * exactly the kind of thing that carries a bearer token.
   */
  toJSON(): {
    code: NotificationErrorCode;
    message: string;
    field?: string;
    context?: Record<string, string | number | boolean>;
  } {
    return {
      code: this.code,
      message: this.message,
      ...(this.field ? { field: this.field } : {}),
      ...(this.context ? { context: this.context } : {}),
    };
  }
}

export function isNotificationError(value: unknown): value is NotificationError {
  return value instanceof NotificationError;
}

/** Shorthand for the two codes validators raise most. */
export function invalidField(
  field: string,
  message: string,
  context?: Record<string, string | number | boolean>,
): NotificationError {
  return new NotificationError(
    NotificationErrorCodes.InvalidField,
    `${field} ${message}.`,
    { field, context },
  );
}

export function missingField(field: string): NotificationError {
  return new NotificationError(
    NotificationErrorCodes.MissingField,
    `${field} is required.`,
    { field },
  );
}
