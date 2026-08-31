/**
 * Stable machine-readable error codes for Gova Direct P2P Agent.
 *
 * Remote clients must never need to parse human prose to make control-flow decisions.
 */

export const DIRECT_ERROR_CODES = [
  "unsupported-protocol",
  "invalid-message",
  "unauthorized",
  "bootstrap-required",
  "bootstrap-expired",
  "challenge-mismatch",
  "challenge-consumed",
  "session-expired",
  "session-revoked",
  "capability-denied",
  "replay-detected",
  "stale-request",
  "path-denied",
  "secret-export-denied",
  "lock-conflict",
  "memory-admission-denied",
  "stale-main",
  "command-timeout",
  "command-cancelled",
  "direct-path-unavailable",
  "transport-error",
  "internal-error",
] as const;

export type DirectErrorCode = (typeof DIRECT_ERROR_CODES)[number];

export interface DirectErrorPayload {
  code: DirectErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export class DirectAgentError extends Error {
  readonly code: DirectErrorCode;
  readonly details?: Record<string, unknown>;
  readonly retryable: boolean;

  constructor(code: DirectErrorCode, message: string, details?: Record<string, unknown>, retryable = false) {
    super(`[${code}] ${message}`);
    this.name = "DirectAgentError";
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }

  toJSON(): DirectErrorPayload {
    return {
      code: this.code,
      message: this.message.replace(new RegExp(`^\\[${this.code}\\]\\s*`), ""),
      ...(this.details ? { details: this.details } : {}),
      ...(this.retryable ? { retryable: true } : {}),
    };
  }

  static fromJSON(json: unknown): DirectAgentError {
    if (!json || typeof json !== "object") {
      return new DirectAgentError("internal-error", "Unknown error format");
    }
    const record = json as Partial<DirectErrorPayload>;
    const code = (DIRECT_ERROR_CODES as readonly string[]).includes(record.code ?? "")
      ? (record.code as DirectErrorCode)
      : "internal-error";
    const message = typeof record.message === "string" ? record.message : "Direct agent error";
    return new DirectAgentError(code, message, record.details, Boolean(record.retryable));
  }
}
