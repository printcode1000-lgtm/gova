"use client";

import { useEffect } from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import {
  addSystemLog,
  setSystemLogCollectorAuthorized,
  type SystemLogLevel,
} from "@/features/system-logs/system-log-store";

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
  const capacitor = (window as Window & {
    Capacitor?: { getPlatform?: () => string };
  }).Capacitor;
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

export function SystemLogCollector() {
  const { session, isLoading } = useSession();
  const enabled = !isLoading && isSuperAdmin(session);

  useEffect(() => {
    setSystemLogCollectorAuthorized(enabled);
    if (!enabled) return () => setSystemLogCollectorAuthorized(false);

    const originals = Object.fromEntries(
      methods.map((method) => [method, console[method].bind(console)]),
    ) as Record<ConsoleMethod, (...data: unknown[]) => void>;

    methods.forEach((method) => {
      console[method] = (...data: unknown[]) => {
        originals[method](...data);
        const error = data.find((item): item is Error => item instanceof Error);
        addSystemLog({
          level: levelFor(method),
          consoleMethod: `console.${method}`,
          message: data.map(serialize).join(" "),
          page: `${window.location.pathname}${window.location.search}`,
          platform: platform(),
          errorName: error?.name,
          userAgent: navigator.userAgent,
          stack: diagnosticStack(method, error),
        });
      };
    });

    const handleError = (event: ErrorEvent) => {
      addSystemLog({
        level: "error",
        consoleMethod: "window.error",
        message: event.message || "Unhandled browser error",
        page: `${window.location.pathname}${window.location.search}`,
        platform: platform(),
        errorName:
          event.error instanceof Error ? event.error.name : "UnhandledError",
        sourceFile: event.filename || undefined,
        sourceLine: event.lineno || undefined,
        sourceColumn: event.colno || undefined,
        userAgent: navigator.userAgent,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      addSystemLog({
        level: "error",
        consoleMethod: "unhandledrejection",
        message: serialize(reason),
        page: `${window.location.pathname}${window.location.search}`,
        platform: platform(),
        errorName:
          reason instanceof Error ? reason.name : "UnhandledPromiseRejection",
        userAgent: navigator.userAgent,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
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
      addSystemLog({
        level: "warning",
        consoleMethod: "resource.error",
        message: `Failed to load ${target.tagName.toLowerCase()} resource${url ? `: ${url}` : ""}`,
        page: `${window.location.pathname}${window.location.search}`,
        platform: platform(),
        errorName: "ResourceLoadError",
        sourceFile: url,
        userAgent: navigator.userAgent,
        feature: "BrowserResource",
        operation: `load-${target.tagName.toLowerCase()}`,
        stack: new Error("Resource load failure").stack,
      });
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
