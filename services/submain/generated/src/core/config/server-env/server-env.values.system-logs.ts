import { readEnv } from "@asol/env-core";

/**
 * Server configuration for System Logs persistence.
 *
 * Only retention and alerting are configurable; the database target belongs to
 * the data adapter and the identity check belongs to auth, so neither is read
 * here.
 */

function positiveNumber(name: string, fallback: number): number {
  const value = Number(readEnv(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getSystemLogsRetentionDays(fallback: number): number {
  return positiveNumber("SYSTEM_LOGS_RETENTION_DAYS", fallback);
}

export function getSystemLogsAlertThreshold(fallback: number): number {
  return positiveNumber("SYSTEM_LOGS_ALERT_THRESHOLD", fallback);
}

export function getSystemLogsAlertWindowMs(fallback: number): number {
  return positiveNumber("SYSTEM_LOGS_ALERT_WINDOW_MS", fallback);
}

/** Null when no operational alert webhook is configured. */
export function getSystemLogsAlertWebhookUrl(): string | null {
  return readEnv("SYSTEM_LOGS_ALERT_WEBHOOK_URL").trim() || null;
}
