/**
 * Unified error taxonomy for the Native Platform layer.
 *
 * Single responsibility: give every module one error shape so callers never
 * branch on plugin-specific error codes or platform-specific messages.
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

/** The only error type the Native Platform layer throws. */
export class NativePlatformError extends Error {
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
    this.name = "NativePlatformError";
    this.code = code;
    this.module = module;
    this.cause = cause;
    this.recovery = recovery;
  }

  static unavailable(module: string, detail?: string): NativePlatformError {
    return new NativePlatformError(
      NativeErrorCodes.Unavailable,
      module,
      detail ?? `${module} is not available on this platform.`,
    );
  }

  static permissionDenied(
    module: string,
    detail?: string,
    recovery?: NativeErrorRecovery,
  ): NativePlatformError {
    return new NativePlatformError(
      NativeErrorCodes.PermissionDenied,
      module,
      detail ?? `${module} permission was not granted.`,
      undefined,
      recovery,
    );
  }

  static cancelled(module: string): NativePlatformError {
    return new NativePlatformError(
      NativeErrorCodes.Cancelled,
      module,
      `${module} operation was cancelled.`,
    );
  }

  static timeout(module: string, ms: number): NativePlatformError {
    return new NativePlatformError(
      NativeErrorCodes.Timeout,
      module,
      `${module} timed out after ${ms}ms.`,
    );
  }

  static invalidArgument(module: string, detail: string): NativePlatformError {
    return new NativePlatformError(
      NativeErrorCodes.InvalidArgument,
      module,
      detail,
    );
  }

  static serviceDisabled(module: string, detail: string): NativePlatformError {
    return new NativePlatformError(
      NativeErrorCodes.ServiceDisabled,
      module,
      detail,
    );
  }

  static internal(module: string, cause: unknown): NativePlatformError {
    const message =
      cause instanceof Error ? cause.message : String(cause ?? "Unknown error");
    return new NativePlatformError(
      NativeErrorCodes.Internal,
      module,
      message,
      cause,
    );
  }
}

export function isNativePlatformError(
  value: unknown,
): value is NativePlatformError {
  return value instanceof NativePlatformError;
}

export function isCancelledError(value: unknown): boolean {
  return (
    isNativePlatformError(value) && value.code === NativeErrorCodes.Cancelled
  );
}

/** True when the platform operation stopped because the user denied access. */
export function isPermissionDeniedError(
  value: unknown,
): value is NativePlatformError {
  return (
    isNativePlatformError(value) &&
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

/**
 * Plugin error codes that mean "the user backed out", per plugin family.
 * Kept here so no module re-implements cancellation detection.
 */
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
 * Convert any thrown value into a `NativePlatformError`.
 * Every module funnels its catch blocks through this one function.
 */
export function toNativeError(
  module: string,
  error: unknown,
): NativePlatformError {
  if (isNativePlatformError(error)) return error;
  if (looksCancelled(error)) return NativePlatformError.cancelled(module);
  if (looksPermissionDenied(error)) {
    return NativePlatformError.permissionDenied(module, messageOf(error));
  }
  return NativePlatformError.internal(module, error);
}
