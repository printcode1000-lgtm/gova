/**
 * Unified error taxonomy for the @asol/native-core package.
 * Single responsibility: define error codes and the central NativeCoreError class.
 */

export const NativeErrorCodes = {
  /** The feature does not exist on this platform or the plugin is absent. */
  Unavailable: "unavailable",
  /** The user or the system refused a required permission. */
  PermissionDenied: "permission-denied",
  /** The user dismissed a picker, prompt, or scanner without a result. */
  Cancelled: "cancelled",
  /** The operation exceeded its allotted time. */
  Timeout: "timeout",
  /** Caller passed an argument the module cannot honour. */
  InvalidArgument: "invalid-argument",
  /** A device service (GPS, camera hardware) is switched off. */
  ServiceDisabled: "service-disabled",
  /** The underlying plugin threw for a reason the layer cannot classify. */
  Internal: "internal",
} as const;

export type NativeErrorCode =
  (typeof NativeErrorCodes)[keyof typeof NativeErrorCodes];

export const NativeErrorRecoveries = {
  OpenSettings: "open-settings",
} as const;

export type NativeErrorRecovery =
  (typeof NativeErrorRecoveries)[keyof typeof NativeErrorRecoveries];

/** The single error type the @asol/native-core package produces. */
export class NativeCoreError extends Error {
  readonly code: NativeErrorCode;
  readonly module: string;
  readonly cause?: unknown;
  readonly recovery?: NativeErrorRecovery;

  constructor(
    code: NativeErrorCode,
    module: string,
    message: string,
    cause?: unknown,
    recovery?: NativeErrorRecovery,
  ) {
    super(message);
    this.name = "NativeCoreError";
    this.code = code;
    this.module = module;
    this.cause = cause;
    this.recovery = recovery;
  }

  isPermissionDenied(): boolean {
    return (
      this.code === NativeErrorCodes.PermissionDenied ||
      looksPermissionDenied(this.message)
    );
  }

  isCancelled(): boolean {
    return (
      this.code === NativeErrorCodes.Cancelled ||
      looksCancelled(this.message)
    );
  }

  isUnavailable(): boolean {
    return this.code === NativeErrorCodes.Unavailable;
  }

  static unavailable(module: string, detail?: string): NativeCoreError {
    return new NativeCoreError(
      NativeErrorCodes.Unavailable,
      module,
      detail ?? `${module} is not available on this platform.`,
    );
  }

  static permissionDenied(
    module: string,
    detail?: string,
    recovery?: NativeErrorRecovery,
  ): NativeCoreError {
    return new NativeCoreError(
      NativeErrorCodes.PermissionDenied,
      module,
      detail ?? `${module} permission was not granted.`,
      undefined,
      recovery,
    );
  }

  static cancelled(module: string): NativeCoreError {
    return new NativeCoreError(
      NativeErrorCodes.Cancelled,
      module,
      `${module} operation was cancelled.`,
    );
  }

  static timeout(module: string, ms: number): NativeCoreError {
    return new NativeCoreError(
      NativeErrorCodes.Timeout,
      module,
      `${module} timed out after ${ms}ms.`,
    );
  }

  static invalidArgument(module: string, detail: string): NativeCoreError {
    return new NativeCoreError(
      NativeErrorCodes.InvalidArgument,
      module,
      detail,
    );
  }

  static serviceDisabled(module: string, detail: string): NativeCoreError {
    return new NativeCoreError(
      NativeErrorCodes.ServiceDisabled,
      module,
      detail,
    );
  }

  static internal(module: string, cause: unknown): NativeCoreError {
    const message =
      cause instanceof Error ? cause.message : String(cause ?? "Unknown error");
    return new NativeCoreError(
      NativeErrorCodes.Internal,
      module,
      message,
      cause,
    );
  }
}

export function isNativeCoreError(
  value: unknown,
): value is NativeCoreError {
  return value instanceof NativeCoreError;
}

export function isCancelledError(value: unknown): boolean {
  return (
    isNativeCoreError(value) && value.code === NativeErrorCodes.Cancelled
  );
}

export function isUnavailableError(value: unknown): boolean {
  return (
    isNativeCoreError(value) && value.code === NativeErrorCodes.Unavailable
  );
}

/** True when the platform operation stopped because the user denied access. */
export function isPermissionDeniedError(
  value: unknown,
): value is NativeCoreError {
  return (
    isNativeCoreError(value) &&
    value.code === NativeErrorCodes.PermissionDenied
  );
}

/** True when the only useful recovery is the application's OS settings. */
export function permissionErrorRequiresSettings(value: unknown): boolean {
  return (
    isPermissionDeniedError(value) &&
    value.recovery === NativeErrorRecoveries.OpenSettings
  );
}

const CANCELLED_MARKERS = [
  "cancel",
  "canceled",
  "cancelled",
  "user_cancelled",
  "userdenied",
  "no image picked",
  "no media selected",
  "dismissed",
];

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

function codeOf(error: unknown): string {
  const candidate = (error as { code?: unknown } | null)?.code;
  return typeof candidate === "string" ? candidate : "";
}

/** True when a raw plugin error represents user cancellation. */
export function looksCancelled(error: unknown): boolean {
  const haystack = `${codeOf(error)} ${messageOf(error)}`.toLowerCase();
  return CANCELLED_MARKERS.some((marker) => haystack.includes(marker));
}

/** True when a raw plugin error represents a denied permission. */
export function looksPermissionDenied(error: unknown): boolean {
  const haystack = `${codeOf(error)} ${messageOf(error)}`.toLowerCase();
  return (
    haystack.includes("permission") ||
    haystack.includes("denied") ||
    haystack.includes("not authorized") ||
    haystack.includes("unauthorized")
  );
}

/**
 * Convert any thrown error or bridge exception into a NativeCoreError.
 */
export function toNativeCoreError(
  module: string,
  error: unknown,
): NativeCoreError {
  if (isNativeCoreError(error)) return error;
  if (looksCancelled(error)) return NativeCoreError.cancelled(module);
  if (looksPermissionDenied(error)) {
    return NativeCoreError.permissionDenied(module, messageOf(error));
  }
  return NativeCoreError.internal(module, error);
}
