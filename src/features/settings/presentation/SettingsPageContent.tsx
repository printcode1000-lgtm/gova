"use client";

import { formatDateTime } from "@asol/format-core";
import Link from "next/link";

import { RefreshCw, RotateCcw } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { cn } from "@/shared/utils";
import { useAppPreferences, useThemePreferences } from "@/shared/preferences";
import { useTranslation } from "@/shared/i18n";
import {
  CLEAR_STORAGE_WARNING,
  clearAllClientStorage,
} from '@/features/app-reset';
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { useOtaUpdate } from "@asol/ota-core";
import { registerBrowserPorts } from "@/core/composition/browser-ports";
import { publicEnv } from "@/core/config/public-env";
import { notifications } from "@/features/notifications";
import { uiAttributes } from "@asol/ui-registry-core";

// Sealed packages name ports; the application supplies them. Registered at module load so the
// hook below has telemetry and the super-admin predicate before its first render. Unregistered
// is safe rather than fatal — telemetry no-ops and the predicate fails closed — which is why
// this is a one-line call into the composition root and not a bootstrap requirement.
registerBrowserPorts();

export function SettingsPageContent() {
  const { t } = useTranslation();
  const { resetPreferences: resetTheme } = useThemePreferences();
  const { preferences: appPrefs, resetPreferences: resetApp } =
    useAppPreferences();
  const { session } = useSession();
  const ota = useOtaUpdate();
  const [statusText, setStatusText] = React.useState("");
  const [clearing, setClearing] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);

  const showStatus = (message: string) => {
    setStatusText(message);
    window.setTimeout(() => setStatusText(""), 3000);
  };

  const handleClearAll = async () => {
    setShowClearDialog(true);
  };

  const confirmClearAll = async () => {
    setShowClearDialog(false);
    setClearing(true);
    try {
      if (session) {
        await notifications.unregisterDevice({
          uid: session.uid,
          phone: session.phone,
        });
      }
      resetTheme();
      resetApp();
      await clearAllClientStorage();
      window.location.reload();
    } catch (error) {
      console.error("[Settings] Failed to clear client storage.", error);
      showStatus(t("settings.clearError"));
      setClearing(false);
    }
  };

  const otaDownloaded = ota.progress?.downloadedBytes ?? ota.state.download?.downloadedBytes ?? 0;
  const otaTotal = ota.progress?.totalBytes ?? ota.state.download?.totalBytes ?? 0;
  const otaPercent = otaTotal > 0 ? Math.min(100, Math.round((otaDownloaded / otaTotal) * 100)) : 0;
  const otaStatusKey = ota.state.pending?.ready
    ? "ota.ready"
    : ota.progress?.statusKey ?? ota.state.lastStatusKey ?? "ota.current";
  const formatOtaBytes = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(bytes ? 1 : 0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div {...uiAttributes({ uid: "settings.settings-page-content.div.13-xc6EnD", id: "settings.settings-page-content.div.13" })} id="settings.settings-page-content.div" className="mx-auto w-full max-w-4xl px-4 py-6 pb-32 sm:px-6 sm:py-12 md:px-12">
      <header {...uiAttributes({ uid: "settings.settings-page-content.header.2-rF3UvA", id: "settings.settings-page-content.header.2" })} id="settings.settings-page-content.header" className="mb-12 space-y-2 text-center">
        <h1 {...uiAttributes({ uid: "settings.settings-page-content.h1.2-n5Pc1W", id: "settings.settings-page-content.h1.2" })} id="settings.settings-page-content.h1" className="text-3xl font-bold text-primary">
          {t("settings.title")}
        </h1>
        <p {...uiAttributes({ uid: "settings.settings-page-content.p.5-SRTE90", id: "settings.settings-page-content.p.5" })} id="settings.settings-page-content.p" className="text-base text-on-surface-variant">
          {t("settings.description")}
        </p>
        {statusText ? (
          <p {...uiAttributes({ uid: "settings.settings-page-content.p.6-2ODdL4", id: "settings.settings-page-content.p.6" })} id="settings.settings-page-content.p.2" className="text-sm font-medium text-primary" role="status">
            {statusText}
          </p>
        ) : null}
      </header>

      {/* Updates */}
      <section {...uiAttributes({ uid: "settings.settings-page-content.section.2-gQ8ftI", id: "settings.settings-page-content.section.2" })} id="settings.settings-page-content.section" className="mb-12 space-y-6">
        <div {...uiAttributes({ uid: "settings.settings-page-content.div.14-lAF2G7", id: "settings.settings-page-content.div.14" })} id="settings.settings-page-content.div.2" className="asol-settings-section-secondary space-y-4">
          {(
            [
              [t("ota.settings.nativeVersion"), <span dir="ltr" key="native" {...uiAttributes({ uid: "settings.settings-page-content.span.3-FKLZ7V", id: "settings.settings-page-content.span.3" })}>{publicEnv.nativeVersion}</span>],
              [t("ota.settings.webVersion"), <span dir="ltr" key="web" {...uiAttributes({ uid: "settings.settings-page-content.span.4-KS307L", id: "settings.settings-page-content.span.4" })}>{publicEnv.webBundleVersion}</span>],
              [
                t("ota.settings.lastCheck"),
                ota.state.lastSuccessfulCheckAt
                  ? formatDateTime(ota.state.lastSuccessfulCheckAt, appPrefs.locale)
                  : t("ota.settings.never"),
              ],
              [
                t("ota.settings.status"),
                t(otaStatusKey, {
                  size: formatOtaBytes(
                    ota.progress?.requiredFreeBytes ?? ota.state.requiredFreeBytes ?? 0,
                  ),
                }),
              ],
            ] as const
          ).map(([label, value], index) => (
            <div
              key={index} {...uiAttributes({ uid: "settings.settings-page-content.div.15-O31PhM", id: "settings.settings-page-content.div.15" })}
              className={cn(
                "grid grid-cols-2 items-center px-4 py-3 text-sm",
                index > 0 && "border-t border-outline-variant/60",
              )}
            >
              <span {...uiAttributes({ uid: "settings.settings-page-content.span.5-bR3DEC", id: "settings.settings-page-content.span.5" })} className="text-on-surface-variant">{label}</span>
              <span {...uiAttributes({ uid: "settings.settings-page-content.span.6-07cJSC", id: "settings.settings-page-content.span.6" })} className="justify-self-end font-semibold text-on-surface">{value}</span>
            </div>
          ))}
          {otaTotal > 0 && ota.state.download ? (
            <div {...uiAttributes({ uid: "settings.settings-page-content.div.16-0RBL4r", id: "settings.settings-page-content.div.16" })} id="settings.settings-page-content.div.3" className="space-y-2 px-4" aria-live="polite">
              <div {...uiAttributes({ uid: "settings.settings-page-content.div.17-4XJPjv", id: "settings.settings-page-content.div.17" })} id="settings.settings-page-content.div.4" className="flex items-center justify-between text-sm font-semibold text-on-surface">
                <span {...uiAttributes({ uid: "settings.settings-page-content.span.7-lB4VgC", id: "settings.settings-page-content.span.7" })} id="settings.settings-page-content.span">{otaPercent}%</span>
                <span {...uiAttributes({ uid: "settings.settings-page-content.span.8-QO8AP2", id: "settings.settings-page-content.span.8" })} id="settings.settings-page-content.span.2" dir="ltr">{formatOtaBytes(otaDownloaded)} / {formatOtaBytes(otaTotal)}</span>
              </div>
              <div {...uiAttributes({ uid: "settings.settings-page-content.div.18-EBB1LW", id: "settings.settings-page-content.div.18" })} id="settings.settings-page-content.div.5" className="h-2 overflow-hidden rounded-full bg-surface-variant">
                <div {...uiAttributes({ uid: "settings.settings-page-content.div.19-Z99YAS", id: "settings.settings-page-content.div.19" })} id="settings.settings-page-content.div.6" className="h-full bg-primary transition-[width]" style={{ width: `${otaPercent}%` }} />
              </div>
            </div>
          ) : null}
          {ota.error ? <p {...uiAttributes({ uid: "settings.settings-page-content.p.7-QG9dL1", id: "settings.settings-page-content.p.7" })} id="settings.settings-page-content.p.3" className="px-4 text-sm text-error">{ota.error}</p> : null}
          <div {...uiAttributes({ uid: "settings.settings-page-content.div.20-ISIL2X", id: "settings.settings-page-content.div.20" })} id="settings.settings-page-content.div.7" className="flex flex-wrap items-center gap-2 px-4">
          {/*
            Shown only while a verified release is sitting on disk waiting for
            a launch. Outside that one state there is nothing to restart for,
            so the button does not exist rather than being disabled.
          */}
          {ota.state.pending?.ready ? (
            <button {...uiAttributes({ uid: "settings.settings-page-content.button.4-uFTeT9", id: "settings.settings-page-content.button.4" })} id="settings.settings-page-content.button"
              type="button"
              onClick={() => void ota.applyNow()}
              disabled={ota.busy}
              className="asol-control inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary disabled:opacity-60"
            >
              <RotateCcw id="settings.settings-page-content.rotate-ccw" className="h-4 w-4" aria-hidden="true" />
              {t("ota.settings.restart")}
            </button>
          ) : null}
          <button {...uiAttributes({ uid: "settings-check-update-P5F6mv", id: "settings-check-update", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "settings-check-update" } })}
            type="button"
            onClick={() => void ota.checkNow()}
            disabled={ota.busy}
            className="asol-control inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            <RefreshCw id="settings.settings-page-content.refresh-cw" className={`h-4 w-4 ${ota.busy ? "animate-spin" : ""}`} aria-hidden="true" />
            {/*
              The label follows the real stage, not a boolean. `busy` covers
              the check, the download and the extraction — minutes of work —
              and labelling all of it "checking" made a working update look
              hung, which is exactly how it was reported.
            */}
            {ota.busy ? t(otaStatusKey, {
              size: formatOtaBytes(
                ota.progress?.requiredFreeBytes ?? ota.state.requiredFreeBytes ?? 0,
              ),
            }) : t("ota.settings.check")}
          </button>
          </div>
        </div>
      </section>

      <Link {...uiAttributes({ uid: "settings-notifications-0fUSb9", id: "settings-notifications", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "settings-notifications" } })}
        href="/settings/notifications"
        className="asol-control flex w-full items-center justify-center rounded-xl border border-outline-variant px-6 py-3 font-semibold text-on-surface"
      >
        {t("settings.notifications.title")}
      </Link>

      {/* Footer actions — restore/clear is a destructive dev-facing reset, visible to super admins only */}
      {isSuperAdmin(session) ? (
        <footer {...uiAttributes({ uid: "settings.settings-page-content.footer.2-n5tuYi", id: "settings.settings-page-content.footer.2" })} id="settings.settings-page-content.footer" className="flex flex-col items-center justify-center gap-4 pt-12 md:flex-row-reverse">
          <button {...uiAttributes({ uid: "settings-clear-data-BOVk0K", id: "settings-clear-data", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "settings-clear-data" } })}
            type="button"
            disabled={clearing}
            className="asol-control flex w-full items-center justify-center gap-2 rounded-xl border-2 border-error/30 bg-gradient-to-r from-error/10 to-error/5 px-6 py-3 font-semibold text-error shadow-lg shadow-error/10 transition-all md:w-auto disabled:opacity-60"
            onClick={handleClearAll}
          >
            <FontAwesomeIcon id="settings.settings-page-content.font-awesome-icon" icon={faRotateLeft} className="h-4 w-4" />
            {clearing ? t("settings.clearing") : t("settings.restoreDefaults")}
          </button>
        </footer>
      ) : null}

      {/* Clear Confirmation Dialog */}
      {showClearDialog && (
        <div {...uiAttributes({ uid: "settings.settings-page-content.div.21-L0wOva", id: "settings.settings-page-content.div.21" })} id="settings.settings-page-content.div.8" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div {...uiAttributes({ uid: "settings.settings-page-content.div.22-3ZlCQH", id: "settings.settings-page-content.div.22" })} id="settings.settings-page-content.div.9" className="mx-4 max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <div {...uiAttributes({ uid: "settings.settings-page-content.div.23-yn9jvM", id: "settings.settings-page-content.div.23" })} id="settings.settings-page-content.div.10" className="mb-4 flex items-center gap-3">
              <div {...uiAttributes({ uid: "settings.settings-page-content.div.24-MM9o2x", id: "settings.settings-page-content.div.24" })} id="settings.settings-page-content.div.11" className="flex h-12 w-12 items-center justify-center rounded-xl bg-error/20">
                <FontAwesomeIcon id="settings.settings-page-content.font-awesome-icon.2"
                  icon={faRotateLeft}
                  className="h-6 w-6 text-error"
                />
              </div>
              <h3 {...uiAttributes({ uid: "settings.settings-page-content.h3.2-ERZZ9M", id: "settings.settings-page-content.h3.2" })} id="settings.settings-page-content.h3" className="text-xl font-semibold text-on-surface">
                {t("settings.restoreDefaults")}
              </h3>
            </div>
            <p {...uiAttributes({ uid: "settings.settings-page-content.p.8-H6doyx", id: "settings.settings-page-content.p.8" })} id="settings.settings-page-content.p.4" className="mb-6 text-sm text-on-surface-variant">
              {CLEAR_STORAGE_WARNING}
            </p>
            <div {...uiAttributes({ uid: "settings.settings-page-content.div.25-TQrCC3", id: "settings.settings-page-content.div.25" })} id="settings.settings-page-content.div.12" className="flex gap-3">
              <button {...uiAttributes({ uid: "settings.settings-page-content.button.5-OVA1S9", id: "settings.settings-page-content.button.5" })} id="settings.settings-page-content.button.2"
                type="button"
                onClick={() => setShowClearDialog(false)}
                className="asol-control flex-1 rounded-xl px-4 py-2 font-semibold text-on-surface-variant"
              >
                إلغاء
              </button>
              <button {...uiAttributes({ uid: "settings.settings-page-content.button.6-1G1EFV", id: "settings.settings-page-content.button.6" })} id="settings.settings-page-content.button.3"
                type="button"
                onClick={confirmClearAll}
                className="asol-control flex-1 rounded-xl bg-error px-4 py-2 font-semibold text-on-primary"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
