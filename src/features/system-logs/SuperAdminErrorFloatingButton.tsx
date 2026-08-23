"use client";

import { Bug, ChevronLeft, ListPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { mergeLiveAndPersistentCounts } from "@asol/system-logs-core";

import { usePageSaveOperationScope } from "@/features/page-save/ui";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import type { PersistentSystemLogEntry } from "@/features/system-logs/domain/persistent-system-log.entity";
import { persistentSystemLogApiService } from "@/features/system-logs/services/persistent-system-log-api-service";
import {
  clearAllSystemLogs,
  getSystemLogsSnapshot,
  subscribeToSystemLogs,
} from "@/features/system-logs/system-log-store";

const REFRESH_MS = 20_000;
const LOGS_ROUTE = "/super-admin/logs";

export function SuperAdminErrorFloatingButton() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = !isLoading && isSuperAdmin(session);
  const liveLogs = useSyncExternalStore(
    subscribeToSystemLogs,
    getSystemLogsSnapshot,
    getSystemLogsSnapshot,
  );
  const [persistentLogs, setPersistentLogs] = useState<PersistentSystemLogEntry[]>([]);
  const pathname = usePathname();
  const logOperations = usePageSaveOperationScope({
    id: "system-logs-floating",
    label: "سجل الأخطاء",
    returnPath: pathname || LOGS_ROUTE,
    enabled: authorized,
  });

  useEffect(() => {
    const sessionToken = session?.sessionToken;
    if (!authorized || !sessionToken) {
      setPersistentLogs([]);
      return;
    }

    let cancelled = false;
    const load = () => {
      void persistentSystemLogApiService
        .list(sessionToken, { limit: 500, level: "error" })
        .then((items) => {
          if (!cancelled) setPersistentLogs(items);
        })
        .catch((error) => {
          console.warn("[SystemLogs] Failed to load floating error count.", error);
        });
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    const onChanged = () => load();
    window.addEventListener("asol:system-logs-changed", onChanged);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("asol:system-logs-changed", onChanged);
    };
  }, [authorized, session?.sessionToken]);

  const errorCount = useMemo(() => {
    const liveErrorCount = liveLogs
      .filter((entry) => entry.level === "error")
      .reduce((sum, entry) => sum + Math.max(1, entry.occurrences), 0);
    const liveFingerprints = new Set(
      liveLogs.filter((entry) => entry.level === "error").map((entry) => entry.fingerprint),
    );
    return mergeLiveAndPersistentCounts(liveErrorCount, persistentLogs, liveFingerprints);
  }, [liveLogs, persistentLogs]);

  const stageClearAllLogs = () => {
    logOperations.stage({
      itemId: "system-logs-clear-all",
      kind: "delete",
      label: "حذف السجل المحلي المباشر وكل السجلات المحفوظة",
      execute: async () => {
        clearAllSystemLogs();
        setPersistentLogs([]);
        try {
          if (session?.sessionToken) {
            await persistentSystemLogApiService.clear(session.sessionToken);
          }
          return true;
        } catch (error) {
          console.warn(
            "[SystemLogs] Failed to clear all logs from floating button.",
            error,
          );
          return false;
        }
      },
    });
  };

  if (!authorized || errorCount === 0) return null;

  return (
    <>
      <div
        className={
          "fixed bottom-[calc(5.5rem+var(--asol-safe-area-bottom))] end-4 z-[145] " +
          "flex max-w-[calc(100vw-2rem)] items-stretch gap-0.5 rounded-full " +
          "border border-error/40 bg-error p-0.5 text-xs font-bold text-on-error " +
          "shadow-lg shadow-error/25"
        }
        role="group"
        aria-label={`أخطاء النظام: ${errorCount}`}
      >
        <button
          type="button"
          onClick={() => router.push(LOGS_ROUTE)}
          className="flex items-center gap-1 rounded-full px-2 py-1 active:bg-on-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-error"
          aria-label={`فتح سجل الأخطاء: ${errorCount}`}
        >
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
            <Bug className="h-4 w-4" />
            <span className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full bg-white ring-1 ring-error" />
          </span>
          <span className="tabular-nums">{errorCount}</span>
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
        </button>
        <span className="my-1 w-px shrink-0 bg-on-error/25" aria-hidden />
        <button
          type="button"
          onClick={stageClearAllLogs}
          className="rounded-full px-1.5 py-1 active:bg-on-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-error"
          aria-label="إضافة حذف جميع السجلات إلى الحفظ"
        >
          <ListPlus className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
    </>
  );
}
