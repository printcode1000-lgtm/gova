export class OtaCoreError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "OtaCoreError";
    this.code = code;
    this.details = details;
  }

  static gateBlocked(reason: string, details?: unknown): OtaCoreError {
    return new OtaCoreError("GATE_BLOCKED", reason, details);
  }

  static gateUnprovable(reason: string): OtaCoreError {
    return new OtaCoreError("GATE_UNPROVABLE", reason);
  }

  static confirmationRequired(action: string, flag: string): OtaCoreError {
    return new OtaCoreError(
      "CONFIRMATION_REQUIRED",
      `Explicit confirmation required for ${action}. Pass ${flag}.`,
    );
  }

  static invalidVersion(message: string): OtaCoreError {
    return new OtaCoreError("INVALID_VERSION", message);
  }

  static storageError(message: string, details?: unknown): OtaCoreError {
    return new OtaCoreError("STORAGE_ERROR", message, details);
  }

  static buildFailed(message: string, details?: unknown): OtaCoreError {
    return new OtaCoreError("BUILD_FAILED", message, details);
  }

  static internal(message: string, details?: unknown): OtaCoreError {
    return new OtaCoreError("INTERNAL_ERROR", message, details);
  }
}
