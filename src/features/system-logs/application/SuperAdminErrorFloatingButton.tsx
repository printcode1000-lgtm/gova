"use client";

import { Bug, Check, ChevronLeft, ClipboardCopy, ListPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { mergeLiveAndPersistentCounts } from "@asol/system-logs-core";
import { NativeCore } from "@asol/native-core";

import { usePageSaveOperationScope } from "@/features/page-save/ui";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import type { PersistentSystemLogEntry } from "@/features/system-logs/domain/persistent-system-log.entity";
import { persistentSystemLogApiService } from "@/features/system-logs/application/services/persistent-system-log-api-service";
import {
  clearAllSystemLogs,
  getSystemLogsSnapshot,
  subscribeToSystemLogs,
} from "@/features/system-logs/application/system-log-store";
import {
  formatSystemLogsForCopy,
  type CopyableSystemLogEntry,
} from "@/features/system-logs/application/system-log-copy-text";
import { isEventTargetInside } from "@/features/system-logs/application/is-event-target-inside";
import {
  OVERLAY_CHROME_ATTRIBUTE,
  isOverlayChromeTarget,
} from "@/shared/ui/overlay-chrome";
import { OverlayChromeBranch } from "@/shared/ui/overlay-chrome-branch";
import { uiAttributes } from "@asol/ui-registry-core";

const REFRESH_MS = 20_000;
const LOGS_ROUTE = "/super-admin/logs";
/** How long the expanded toolbar stays open before folding back to the count. */
const COLLAPSE_MS = 6_000;
/** Shared shell so the collapsed badge and the expanded toolbar sit identically. */
const FLOATING_POSITION_CLASS =
  "fixed bottom-[calc(5.5rem+var(--asol-safe-area-bottom))] end-4 z-[145] " +
  "rounded-full border border-error/40 bg-error text-xs font-bold " +
  "text-on-error shadow-lg shadow-error/25";

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
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
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

  // The toolbar folds itself back to the bare count so it never keeps covering
  // page content after the tap that opened it. `copied` restarts the countdown
  // so the copy confirmation is always visible.
  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(() => setExpanded(false), COLLAPSE_MS);
    return () => window.clearTimeout(timer);
  }, [expanded, copied]);

  // Any touch that leaves the toolbar folds it back immediately, so it behaves
  // like a transient overlay rather than a permanent bar.
  useEffect(() => {
    if (!expanded) return;
    const onOutside = (event: Event) => {
      if (isEventTargetInside(toolbarRef.current, event.target)) return;
      if (isOverlayChromeTarget(event.target)) return;
      setExpanded(false);
    };
    document.addEventListener("pointerdown", onOutside, true);
    window.addEventListener("blur", onOutside);
    return () => {
      document.removeEventListener("pointerdown", onOutside, true);
      window.removeEventListener("blur", onOutside);
    };
  }, [expanded]);

  const errorCount = useMemo(() => {
    const liveErrorCount = liveLogs
      .filter((entry) => entry.level === "error")
      .reduce((sum, entry) => sum + Math.max(1, entry.occurrences), 0);
    const liveFingerprints = new Set(
      liveLogs.filter((entry) => entry.level === "error").map((entry) => entry.fingerprint),
    );
    return mergeLiveAndPersistentCounts(liveErrorCount, persistentLogs, liveFingerprints);
  }, [liveLogs, persistentLogs]);

  // Live entries win over their persisted twin so a repeated error is copied
  // once, matching how `errorCount` counts it.
  const errorEntries = useMemo<CopyableSystemLogEntry[]>(() => {
    const live = liveLogs.filter((entry) => entry.level === "error");
    const liveFingerprints = new Set(live.map((entry) => entry.fingerprint));
    return [
      ...live,
      ...persistentLogs.filter(
        (entry) =>
          entry.level === "error" && !liveFingerprints.has(entry.fingerprint),
      ),
    ];
  }, [liveLogs, persistentLogs]);

  const copyErrorLogs = async () => {
    try {
      await NativeCore.writeClipboard({
        string: formatSystemLogsForCopy(errorEntries),
      });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch (error) {
      console.warn("[SystemLogs] Failed to copy error logs.", error);
    }
  };

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
    setExpanded(false);
  };

  if (!authorized || errorCount === 0) return null;

  if (!expanded) {
    return (
      <OverlayChromeBranch id="system-logs.super-admin-error-floating-button.overlay-chrome-branch" className="contents">
        <button
          {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.button.7-pB6cMV", id: "system-logs.super-admin-error-floating-button.button.7" })}
          type="button"
          onClick={() => setExpanded(true)}
          className={
            FLOATING_POSITION_CLASS +
            " flex h-8 min-w-8 items-center justify-center px-2 " +
            "active:bg-error/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-error"
          }
          aria-expanded={false}
          aria-label={`أخطاء النظام: ${errorCount} — عرض الأدوات`}
          {...{ [OVERLAY_CHROME_ATTRIBUTE]: "true" }}
        >
          <span {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.span.7-Ga4UNa", id: "system-logs.super-admin-error-floating-button.span.7" })} id="system-logs.super-admin-error-floating-button.span" className="tabular-nums">{errorCount}</span>
        </button>
      </OverlayChromeBranch>
    );
  }

  return (
    <OverlayChromeBranch id="system-logs.super-admin-error-floating-button.overlay-chrome-branch.2" className="contents">
      <div
        {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.div-n64bML", id: "system-logs.super-admin-error-floating-button.div" })}
        ref={toolbarRef}
        className={
          FLOATING_POSITION_CLASS +
          " flex max-w-[calc(100vw-2rem)] items-stretch gap-0.5 p-0.5"
        }
        role="group"
        aria-label={`أخطاء النظام: ${errorCount}`}
        {...{ [OVERLAY_CHROME_ATTRIBUTE]: "true" }}
      >
        <button {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.button.4-IOTr8W", id: "system-logs.super-admin-error-floating-button.button.4" })} id="system-logs.super-admin-error-floating-button.button"
          type="button"
          onClick={() => {
            setExpanded(false);
            router.push(LOGS_ROUTE);
          }}
          className="flex items-center gap-1 rounded-full px-2 py-1 active:bg-on-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-error"
          aria-label={`فتح سجل الأخطاء: ${errorCount}`}
        >
          <span {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.span.8-4OJj17", id: "system-logs.super-admin-error-floating-button.span.8" })} id="system-logs.super-admin-error-floating-button.span.2" className="relative flex h-4 w-4 shrink-0 items-center justify-center">
            <Bug id="system-logs.super-admin-error-floating-button.bug" className="h-4 w-4" />
            <span {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.span.9-Ey5YHK", id: "system-logs.super-admin-error-floating-button.span.9" })} id="system-logs.super-admin-error-floating-button.span.3" className="absolute -end-0.5 -top-0.5 h-2 w-2 rounded-full bg-white ring-1 ring-error" />
          </span>
          <span {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.span.10-9ZPVps", id: "system-logs.super-admin-error-floating-button.span.10" })} id="system-logs.super-admin-error-floating-button.span.4" className="tabular-nums">{errorCount}</span>
          <ChevronLeft id="system-logs.super-admin-error-floating-button.chevron-left" className="h-3.5 w-3.5 shrink-0" />
        </button>
        <span {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.span.11-9AsAuy", id: "system-logs.super-admin-error-floating-button.span.11" })} id="system-logs.super-admin-error-floating-button.span.5" className="my-1 w-px shrink-0 bg-on-error/25" aria-hidden />
        <button {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.button.5-JGk3Ti", id: "system-logs.super-admin-error-floating-button.button.5" })} id="system-logs.super-admin-error-floating-button.button.2"
          type="button"
          onClick={() => void copyErrorLogs()}
          className="rounded-full px-1.5 py-1 active:bg-on-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-error"
          aria-label={
            copied ? "تم نسخ قائمة الأخطاء" : `نسخ قائمة الأخطاء: ${errorCount}`
          }
        >
          {copied ? (
            <Check id="system-logs.super-admin-error-floating-button.check" className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ClipboardCopy id="system-logs.super-admin-error-floating-button.clipboard-copy" className="h-3.5 w-3.5 shrink-0" />
          )}
        </button>
        <span {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.span.12-h1XO3t", id: "system-logs.super-admin-error-floating-button.span.12" })} id="system-logs.super-admin-error-floating-button.span.6" className="my-1 w-px shrink-0 bg-on-error/25" aria-hidden />
        <button {...uiAttributes({ uid: "system-logs.super-admin-error-floating-button.button.6-TMcZ2z", id: "system-logs.super-admin-error-floating-button.button.6" })} id="system-logs.super-admin-error-floating-button.button.3"
          type="button"
          onClick={stageClearAllLogs}
          className="rounded-full px-1.5 py-1 active:bg-on-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-error"
          aria-label="إضافة حذف جميع السجلات إلى الحفظ"
        >
          <ListPlus id="system-logs.super-admin-error-floating-button.list-plus" className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
    </OverlayChromeBranch>
  );
}
