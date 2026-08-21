import { NOTIFICATION_LIMITS } from "./notification-validation-constants";
import { enumAssert } from "./notification-validation-primitives";

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
