"use client";

import {
  addSystemLog,
  type SystemLogLevel,
} from "@/features/system-logs/system-log-store";
import { publicEnv } from "@/core/config";
import { submitPersistentClientLog } from "./persistent-client-log";

export interface SystemIssueContext {
  level?: Extract<SystemLogLevel, "warning" | "error">;
  feature: string;
  operation: string;
  error: unknown;
  page?: string;
}

function describe(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getPlatform(): "web" | "android" | "ios" {
  const capacitor = (window as Window & {
    Capacitor?: { getPlatform?: () => string };
  }).Capacitor;
  const value = capacitor?.getPlatform?.();
  return value === "android" || value === "ios" ? value : "web";
}

export function reportSystemIssue(context: SystemIssueContext) {
  const error = context.error;
  const entry = {
    level: context.level ?? "error",
    consoleMethod: "asol.issue",
    message: describe(error),
    page:
      context.page ?? `${window.location.pathname}${window.location.search}`,
    platform: getPlatform(),
    errorName: error instanceof Error ? error.name : "ApplicationIssue",
    userAgent: navigator.userAgent,
    feature: context.feature,
    operation: context.operation,
    stack:
      error instanceof Error
        ? error.stack
        : new Error(`${context.feature}: ${context.operation}`).stack,
  } as const;
  const terminalDetails = {
    platform: entry.platform,
    feature: entry.feature,
    operation: entry.operation,
    errorName: entry.errorName,
    message: entry.message,
    page: entry.page,
  };
  if (entry.level === "warning") {
    console.warn("[Asol][SystemIssue] Operation did not complete", terminalDetails);
  } else {
    console.error("[Asol][SystemIssue] Operation failed", terminalDetails);
  }
  addSystemLog(entry);
  submitPersistentClientLog({
    ...entry,
    source: "client",
    appVersion: publicEnv.webBundleVersion,
    nativeVersion: publicEnv.nativeVersion,
  });
}
