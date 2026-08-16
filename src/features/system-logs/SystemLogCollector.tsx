"use client";

import { useEffect } from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { publicEnv } from "@/core/config/public-env";
import {
  addSystemLog,
  setSystemLogCollectorAuthorized,
  type SystemLogLevel,
} from "@/features/system-logs/system-log-store";
import { submitPersistentClientLog } from "./persistent-client-log";

type ConsoleMethod = "log" | "info" | "debug" | "warn" | "error";

const methods: ConsoleMethod[] = ["log", "info", "debug", "warn", "error"];

function serialize(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function platform(): "web" | "android" | "ios" {
  const capacitor = (
    window as Window & {
      Capacitor?: { getPlatform?: () => string };
    }
  ).Capacitor;
  const value = capacitor?.getPlatform?.();
  return value === "android" || value === "ios" ? value : "web";
}

function levelFor(method: ConsoleMethod): SystemLogLevel {
  if (method === "error") return "error";
  if (method === "warn") return "warning";
  return "normal";
}

function diagnosticStack(method: ConsoleMethod, error?: Error) {
  if (error?.stack) return error.stack;
  if (method !== "warn" && method !== "error") return undefined;
  return new Error(`Captured from console.${method}`).stack;
}

function shouldIgnoreConsoleEntry(method: ConsoleMethod, data: unknown[]) {
  if (method !== "info") return false;
  if (typeof data[0] !== "string") return false;
  if (data[0] !== "[AsolOTA] OTA disabled") return false;
  const details = data[1];
  return (
    details !== null &&
    typeof details === "object" &&
    "nativePlatform" in details &&
    (details as { nativePlatform?: unknown }).nativePlatform === false
  );
}

function isExpectedOtaFilesystemMiss(method: ConsoleMethod, data: unknown[]) {
  if (method !== "error") return false;
  const message = data.map(serialize).join(" ");
  return (
    message.includes("OS-PLUG-FILE-0008") &&
    /'(?:stat|rmdir)' failed because file at '.+\/asol-ota\/.+' does not exist\./.test(message)
  );
}

function page() {
  return `${window.location.pathname}${window.location.search}`;
}

function uid() {
  try {
    const raw = document.cookie
      .split(";")
      .find((item) => item.trim().startsWith("asol_uid="));
    return raw ? decodeURIComponent(raw.split("=")[1] ?? "") : undefined;
  } catch {
    return undefined;
  }
}

function versions() {
  return {
    appVersion: publicEnv.webBundleVersion,
    nativeVersion: publicEnv.nativeVersion,
  };
}

function safeResourceUrl(url?: string): string | undefined {
  if (!url?.startsWith("data:")) return url;
  const header = url.slice(0, Math.max(0, url.indexOf(",")));
  return `${header || "data:"},<redacted>`;
}

function isBenignBrowserError(message: string): boolean {
  return (
    message === "ResizeObserver loop completed with undelivered notifications." ||
    message === "ResizeObserver loop limit exceeded"
  );
}

export function SystemLogCollector() {
  const { session, isLoading } = useSession();
  const enabled = !isLoading && isSuperAdmin(session);

  useEffect(() => {
    setSystemLogCollectorAuthorized(enabled);

    const originals = Object.fromEntries(
      methods.map((method) => [method, console[method].bind(console)]),
    ) as Record<ConsoleMethod, (...data: unknown[]) => void>;

    methods.forEach((method) => {
      console[method] = (...data: unknown[]) => {
        originals[method](...data);
        if (shouldIgnoreConsoleEntry(method, data) || isExpectedOtaFilesystemMiss(method, data)) return;
        const error = data.find((item): item is Error => item instanceof Error);
        const level = levelFor(method);
        const entry = {
          level,
          consoleMethod: `console.${method}`,
          message: data.map(serialize).join(" "),
          page: page(),
          platform: platform(),
          errorName: error?.name,
          userAgent: navigator.userAgent,
          stack: diagnosticStack(method, error),
          uid: uid(),
        } as const;
        addSystemLog(entry);
        if (level !== "normal") {
          submitPersistentClientLog({ ...entry, ...versions(), source: "client" });
        }
      };
    });

    const handleError = (event: ErrorEvent) => {
      if (isBenignBrowserError(event.message)) return;
      const entry = {
        level: "error",
        consoleMethod: "window.error",
        message: event.message || "Unhandled browser error",
        page: page(),
        platform: platform(),
        errorName:
          event.error instanceof Error ? event.error.name : "UnhandledError",
        sourceFile: event.filename || undefined,
        sourceLine: event.lineno || undefined,
        sourceColumn: event.colno || undefined,
        userAgent: navigator.userAgent,
        stack: event.error instanceof Error ? event.error.stack : undefined,
        uid: uid(),
      } as const;
      addSystemLog(entry);
      submitPersistentClientLog({ ...entry, ...versions(), source: "client" });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const entry = {
        level: "error",
        consoleMethod: "unhandledrejection",
        message: serialize(reason),
        page: page(),
        platform: platform(),
        errorName:
          reason instanceof Error ? reason.name : "UnhandledPromiseRejection",
        userAgent: navigator.userAgent,
        stack: reason instanceof Error ? reason.stack : undefined,
        uid: uid(),
      } as const;
      addSystemLog(entry);
      submitPersistentClientLog({ ...entry, ...versions(), source: "client" });
    };

    const handleResourceError = (event: Event) => {
      if (event instanceof ErrorEvent) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const url =
        target instanceof HTMLImageElement ||
        target instanceof HTMLScriptElement ||
        target instanceof HTMLIFrameElement
          ? target.src
          : target instanceof HTMLLinkElement
            ? target.href
            : undefined;
      const safeUrl = safeResourceUrl(url);
      const entry = {
        level: "error",
        consoleMethod: "resource.error",
        message: `Failed to load ${target.tagName.toLowerCase()} resource${safeUrl ? `: ${safeUrl}` : ""}`,
        page: page(),
        platform: platform(),
        errorName: "ResourceLoadError",
        sourceFile: safeUrl,
        userAgent: navigator.userAgent,
        feature: "BrowserResource",
        operation: `load-${target.tagName.toLowerCase()}`,
        stack: new Error("Resource load failure").stack,
        uid: uid(),
      } as const;
      addSystemLog(entry);
      submitPersistentClientLog({ ...entry, ...versions(), source: "resource" });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("error", handleResourceError, true);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      methods.forEach((method) => {
        console[method] = originals[method];
      });
      window.removeEventListener("error", handleError);
      window.removeEventListener("error", handleResourceError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
      setSystemLogCollectorAuthorized(false);
    };
  }, [enabled]);

  return null;
}
