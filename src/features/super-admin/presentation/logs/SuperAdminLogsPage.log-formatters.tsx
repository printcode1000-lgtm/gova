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
import { Button } from "@/shared/ui/button";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import {
  clearAllSystemLogs,
  clearSystemLogs,
  getSystemLogCaptureEnabledSnapshot,
  getSystemLogsSnapshot,
  setSystemLogCaptureEnabled,
  subscribeToSystemLogs,
  formatSystemLogEntryForCopy,
  formatSystemLogsForCopy,
  type SystemLogEntry,
  type SystemLogLevel,
} from "@/features/system-logs";
import { cn } from "@/shared/utils";
import { redactSystemLogText } from "@asol/system-logs-core";
import type { PersistentSystemLogEntry } from "@/features/system-logs";

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
  return formatSystemLogsForCopy(entries);
}

export function formatEntryForCopy(entry: SystemLogEntry) {
  return formatSystemLogEntryForCopy(entry);
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
      "تقرير خطأ سحابي",
      "==================",
      `المعرّف: ${entry.id}`,
      `البصمة: ${entry.fingerprint}`,
      `المصدر: ${entry.origin}`,
      `الثقة: ${entry.trustLevel}`,
      `المستوى: ${entry.level}`,
      `المصدر التقني: ${entry.source}`,
      `المنصة: ${entry.platform}`,
      `طريقة وحدة التحكم: ${entry.consoleMethod}`,
      `الطريقة: ${entry.requestMethod ?? "غير محدد"}`,
      `الحالة: ${entry.statusCode ?? "غير محدد"}`,
      `المسار: ${cloudSource(entry)}`,
      `الصفحة: ${entry.page}`,
      `الميزة: ${entry.feature ?? "غير محدد"}`,
      `العملية: ${entry.operation ?? "غير محددة"}`,
      `الخطأ: ${entry.errorName ?? "غير محدد"}`,
      `عدد مرات التكرار: ${entry.occurrences}`,
      `أول ظهور: ${entry.firstOccurredAt}`,
      `آخر ظهور: ${entry.lastOccurredAt}`,
      `إصدار التطبيق: ${entry.appVersion ?? "غير محدد"}`,
      `الإصدار الأصلي: ${entry.nativeVersion ?? "غير محدد"}`,
      `UID: ${entry.uid ?? "غير محدد"}`,
      `وكيل المستخدم: ${entry.userAgent ?? "غير محدد"}`,
      `موقع المصدر: ${source}`,
      entry.messageTruncated
        ? "الرسالة مقصوصة: نعم"
        : "الرسالة مقصوصة: لا",
      entry.stackTruncated ? "التتبع مقصوص: نعم" : "التتبع مقصوص: لا",
      "",
      "الرسالة:",
      entry.message,
      "",
      "تتبع المكدس:",
      entry.stack || "غير متاح",
    ].join("\n"),
  );
}
