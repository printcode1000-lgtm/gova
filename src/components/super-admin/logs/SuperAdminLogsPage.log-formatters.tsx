"use client";

import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ClipboardCopy,
  CloudAlert,
  FileJson,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import {
  clearAllSystemLogs,
  clearSystemLogs,
  getSystemLogCaptureEnabledSnapshot,
  getSystemLogsSnapshot,
  setSystemLogCaptureEnabled,
  subscribeToSystemLogs,
  type SystemLogEntry,
  type SystemLogLevel,
} from "@/features/system-logs/system-log-store";
import { cn } from "@/lib/utils";
import { redactSystemLogText } from "@/features/system-logs/system-log-sanitizer";
import type { PersistentSystemLogEntry } from "@/features/system-logs/entities/persistent-system-log.entity";

export const sections: Array<{
  level: SystemLogLevel;
  title: string;
  empty: string;
  icon: typeof CheckCircle2;
  color: string;
}> = [
  {
    level: "normal",
    title: "طبيعي",
    empty: "لا توجد رسائل طبيعية.",
    icon: CheckCircle2,
    color: "text-emerald-600",
  },
  {
    level: "warning",
    title: "تحذيرات",
    empty: "لا توجد تحذيرات.",
    icon: AlertTriangle,
    color: "text-amber-600",
  },
  {
    level: "error",
    title: "أخطاء وكسور",
    empty: "لا توجد أخطاء أو أعطال.",
    icon: Bug,
    color: "text-destructive",
  },
];

export function formatForCopy(entries: SystemLogEntry[]) {
  return entries.map(formatEntryForCopy).join("\n\n");
}

export function formatEntryForCopy(entry: SystemLogEntry) {
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
      `User Agent: ${entry.userAgent}`,
      `Feature: ${entry.feature ?? "غير محدد"}`,
      `Operation: ${entry.operation ?? "غير محددة"}`,
      `الرسالة:\n${entry.message}`,
      entry.stack ? `Stack trace:\n${entry.stack}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export function cloudSource(entry: PersistentSystemLogEntry) {
  return entry.routeName || entry.page || "server";
}

export function formatCloudEntryForCopy(entry: PersistentSystemLogEntry) {
  const source = entry.sourceFile
    ? `${entry.sourceFile}:${entry.sourceLine ?? "?"}:${entry.sourceColumn ?? "?"}`
    : "غير متاح";
  return redactSystemLogText(
    [
      "Cloud Error Report",
      "==================",
      `ID: ${entry.id}`,
      `Fingerprint: ${entry.fingerprint}`,
      `Origin: ${entry.origin}`,
      `Trust: ${entry.trustLevel}`,
      `Level: ${entry.level}`,
      `Source: ${entry.source}`,
      `Platform: ${entry.platform}`,
      `Console method: ${entry.consoleMethod}`,
      `Method: ${entry.requestMethod ?? "غير محدد"}`,
      `Status: ${entry.statusCode ?? "غير محدد"}`,
      `Route: ${cloudSource(entry)}`,
      `Page: ${entry.page}`,
      `Feature: ${entry.feature ?? "غير محدد"}`,
      `Operation: ${entry.operation ?? "غير محددة"}`,
      `Error: ${entry.errorName ?? "غير محدد"}`,
      `Occurrences: ${entry.occurrences}`,
      `First occurred: ${entry.firstOccurredAt}`,
      `Last occurred: ${entry.lastOccurredAt}`,
      `App version: ${entry.appVersion ?? "غير محدد"}`,
      `Native version: ${entry.nativeVersion ?? "غير محدد"}`,
      `UID: ${entry.uid ?? "غير محدد"}`,
      `User agent: ${entry.userAgent ?? "غير محدد"}`,
      `Source location: ${source}`,
      entry.messageTruncated
        ? "Message truncated: yes"
        : "Message truncated: no",
      entry.stackTruncated ? "Stack truncated: yes" : "Stack truncated: no",
      "",
      "Message:",
      entry.message,
      "",
      "Stack trace:",
      entry.stack || "غير متاح",
    ].join("\n"),
  );
}
