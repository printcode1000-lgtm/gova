"use client";

import { RefreshCw, RotateCcw } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppPreferences, useThemePreferences } from "@/lib/preferences";
import { useTranslation } from "@/lib/i18n";
import {
  CLEAR_STORAGE_WARNING,
  clearAllClientStorage,
} from "@/lib/storage/client-storage";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useOtaUpdate } from "@/features/ota/hooks/use-ota-update";
import { publicEnv } from "@/core/config/public-env";
import { notifications } from "@/features/notifications";

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
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-32 sm:px-6 sm:py-12 md:px-12">
      <header className="mb-12 space-y-2 text-center">
        <h1 className="text-3xl font-bold text-primary">
          {t("settings.title")}
        </h1>
        <p className="text-base text-on-surface-variant">
          {t("settings.description")}
        </p>
        {statusText ? (
          <p className="text-sm font-medium text-primary" role="status">
            {statusText}
          </p>
        ) : null}
      </header>

      {/* Updates */}
      <section className="mb-12 space-y-6">
        <div className="asol-settings-section-secondary space-y-4">
          {(
            [
              [t("ota.settings.nativeVersion"), <span dir="ltr" key="native">{publicEnv.nativeVersion}</span>],
              [t("ota.settings.webVersion"), <span dir="ltr" key="web">{publicEnv.webBundleVersion}</span>],
              [
                t("ota.settings.lastCheck"),
                ota.state.lastSuccessfulCheckAt
                  ? new Intl.DateTimeFormat(appPrefs.locale, { dateStyle: "medium", timeStyle: "short" }).format(ota.state.lastSuccessfulCheckAt)
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
              key={index}
              className={cn(
                "grid grid-cols-2 items-center px-4 py-3 text-sm",
                index > 0 && "border-t border-outline-variant/60",
              )}
            >
              <span className="text-on-surface-variant">{label}</span>
              <span className="justify-self-end font-semibold text-on-surface">{value}</span>
            </div>
          ))}
          {otaTotal > 0 && ota.state.download ? (
            <div className="space-y-2 px-4" aria-live="polite">
              <div className="flex items-center justify-between text-sm font-semibold text-on-surface">
                <span>{otaPercent}%</span>
                <span dir="ltr">{formatOtaBytes(otaDownloaded)} / {formatOtaBytes(otaTotal)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${otaPercent}%` }} />
              </div>
            </div>
          ) : null}
          {ota.error ? <p className="px-4 text-sm text-error">{ota.error}</p> : null}
          <div className="flex flex-wrap items-center gap-2 px-4">
          {/*
            Shown only while a verified release is sitting on disk waiting for
            a launch. Outside that one state there is nothing to restart for,
            so the button does not exist rather than being disabled.
          */}
          {ota.state.pending?.ready ? (
            <button
              type="button"
              onClick={() => void ota.applyNow()}
              disabled={ota.busy}
              className="asol-control inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t("ota.settings.restart")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void ota.checkNow()}
            disabled={ota.busy}
            className="asol-control inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${ota.busy ? "animate-spin" : ""}`} aria-hidden="true" />
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

      {/* Footer actions — restore/clear is a destructive dev-facing reset, visible to super admins only */}
      {isSuperAdmin(session) ? (
        <footer className="flex flex-col items-center justify-center gap-4 pt-12 md:flex-row-reverse">
          <button
            type="button"
            disabled={clearing}
            className="asol-control flex w-full items-center justify-center gap-2 rounded-xl border-2 border-error/30 bg-gradient-to-r from-error/10 to-error/5 px-6 py-3 font-semibold text-error shadow-lg shadow-error/10 transition-all hover:border-error/50 hover:shadow-error/20 md:w-auto disabled:opacity-60"
            onClick={handleClearAll}
          >
            <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
            {clearing ? t("settings.clearing") : t("settings.restoreDefaults")}
          </button>
        </footer>
      ) : null}

      {/* Clear Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-error/20">
                <FontAwesomeIcon
                  icon={faRotateLeft}
                  className="h-6 w-6 text-error"
                />
              </div>
              <h3 className="text-xl font-semibold text-on-surface">
                {t("settings.restoreDefaults")}
              </h3>
            </div>
            <p className="mb-6 text-sm text-on-surface-variant">
              {CLEAR_STORAGE_WARNING}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearDialog(false)}
                className="asol-control flex-1 rounded-xl px-4 py-2 font-semibold text-on-surface-variant hover:bg-surface-variant"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="asol-control flex-1 rounded-xl bg-error px-4 py-2 font-semibold text-on-primary hover:bg-error/90"
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
