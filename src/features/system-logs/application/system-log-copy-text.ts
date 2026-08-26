/**
 * Copy-text formatting for system log entries.
 *
 * Single responsibility: turn a live or persisted system log entry into the
 * Arabic plain-text block used by every "copy log" surface, with sensitive
 * values redacted. It holds no UI, no clipboard access, and no data loading.
 */
import { redactSystemLogText } from "@asol/system-logs-core";

/**
 * Structural shape shared by live (`SystemLogEntry`) and persisted
 * (`PersistentSystemLogEntry`) records, so both copy identically.
 */
export type CopyableSystemLogEntry = {
  level: string;
  consoleMethod: string;
  platform: string;
  page: string;
  message: string;
  firstOccurredAt: string;
  lastOccurredAt: string;
  occurrences: number;
  errorName?: string | null;
  sourceFile?: string | null;
  sourceLine?: number | null;
  sourceColumn?: number | null;
  userAgent?: string | null;
  feature?: string | null;
  operation?: string | null;
  stack?: string | null;
};

export function formatSystemLogEntryForCopy(entry: CopyableSystemLogEntry) {
  const source = entry.sourceFile
    ? `${entry.sourceFile}:${entry.sourceLine ?? "?"}:${entry.sourceColumn ?? "?"}`
    : "غير متاح";
  return redactSystemLogText(
    [
      `المستوى: ${entry.level}`,
      `الطريقة: ${entry.consoleMethod}`,
      `المنصة: ${entry.platform}`,
      `الصفحة: ${entry.page}`,
      `النوع: ${entry.errorName ?? "غير محدد"}`,
      `المصدر: ${source}`,
      `أول ظهور: ${entry.firstOccurredAt}`,
      `آخر ظهور: ${entry.lastOccurredAt}`,
      `عدد مرات التكرار: ${entry.occurrences}`,
      `وكيل المستخدم: ${entry.userAgent ?? ""}`,
      `الميزة: ${entry.feature ?? "غير محدد"}`,
      `العملية: ${entry.operation ?? "غير محددة"}`,
      `الرسالة:\n${entry.message}`,
      entry.stack ? `تتبع المكدس:\n${entry.stack}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export function formatSystemLogsForCopy(entries: CopyableSystemLogEntry[]) {
  return entries.map(formatSystemLogEntryForCopy).join("\n\n");
}
