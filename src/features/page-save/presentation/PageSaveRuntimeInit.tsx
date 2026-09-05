"use client";

import { useEffect } from "react";

import { reportSystemIssue } from "@asol/system-logs-core";

import {
  hydratePageSavePendingFromStorage,
  hydratePageSaveRecoveryFromStorage,
} from "@/features/page-save/application/page-save-core-bootstrap";

/**
 * Ports are registered by the browser composition root. This only restores what
 * the previous session left behind, once the app is running.
 */
export function PageSaveRuntimeInit() {
  useEffect(() => {
    const reportedFailures = new Set<string>();

    const hydrate = async (): Promise<void> => {
      const operations = [
        ["pending", hydratePageSavePendingFromStorage()],
        ["recovery", hydratePageSaveRecoveryFromStorage()],
      ] as const;
      const results = await Promise.allSettled(
        operations.map(([, operation]) => operation),
      );

      results.forEach((result, index) => {
        const kind = operations[index]?.[0] ?? "unknown";
        if (result.status === "fulfilled") {
          reportedFailures.delete(kind);
          return;
        }
        if (reportedFailures.has(kind)) return;
        reportedFailures.add(kind);
        reportSystemIssue({
          level: "error",
          feature: "PageSave",
          operation: `hydrate-${kind}`,
          error: result.reason,
        });
      });
    };

    const retryHydration = (): void => {
      void hydrate();
    };
    const retryWhenVisible = (): void => {
      if (document.visibilityState === "visible") retryHydration();
    };

    retryHydration();
    window.addEventListener("pageshow", retryHydration);
    document.addEventListener("visibilitychange", retryWhenVisible);
    return () => {
      window.removeEventListener("pageshow", retryHydration);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, []);

  return null;
}
