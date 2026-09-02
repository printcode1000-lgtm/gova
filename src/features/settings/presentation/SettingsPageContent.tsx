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
    <div id='features-settings-presentation-settingspagecontent-div-1-rxag7e' className="mx-auto w-full max-w-4xl px-4 py-6 pb-32 sm:px-6 sm:py-12 md:px-12">
      <header id='features-settings-presentation-settingspagecontent-header-2-kuqilv' className="mb-12 space-y-2 text-center">
        <h1 id='features-settings-presentation-settingspagecontent-heading-3-qgqr9b' className="text-3xl font-bold text-primary">
          {t("settings.title")}
        </h1>
        <p id='features-settings-presentation-settingspagecontent-text-4-eb83lg' className="text-base text-on-surface-variant">
          {t("settings.description")}
        </p>
        {statusText ? (
          <p id='features-settings-presentation-settingspagecontent-text-5-fnqusd' className="text-sm font-medium text-primary" role="status">
            {statusText}
          </p>
        ) : null}
      </header>

      {/* Updates */}
      <section id='features-settings-presentation-settingspagecontent-section-6-mqdnw6' className="mb-12 space-y-6">
        <div id='features-settings-presentation-settingspagecontent-div-7-hoecqz' className="asol-settings-section-secondary space-y-4">
          {[
            {
              id: "native-version",
              label: t("ota.settings.nativeVersion"),
              value: <span id="features-settings-presentation-settingspagecontent-text-8-gi9ufv" dir="ltr" key="native">{publicEnv.nativeVersion}</span>,
            },
            {
              id: "web-version",
              label: t("ota.settings.webVersion"),
              value: <span id="features-settings-presentation-settingspagecontent-text-9-vnpxng" dir="ltr" key="web">{publicEnv.webBundleVersion}</span>,
            },
            {
              id: "last-check",
              label: t("ota.settings.lastCheck"),
              value: ota.state.lastSuccessfulCheckAt
                ? formatDateTime(ota.state.lastSuccessfulCheckAt, appPrefs.locale)
                : t("ota.settings.never"),
            },
            {
              id: "status",
              label: t("ota.settings.status"),
              value: t(otaStatusKey, {
                size: formatOtaBytes(
                  ota.progress?.requiredFreeBytes ?? ota.state.requiredFreeBytes ?? 0,
                ),
              }),
            },
          ].map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "grid grid-cols-2 items-center px-4 py-3 text-sm",
                index > 0 && "border-t border-outline-variant/60",
              )}
            >
              <span className="text-on-surface-variant">{item.label}</span>
              <span className="justify-self-end font-semibold text-on-surface">{item.value}</span>
            </div>
          ))}
          {otaTotal > 0 && ota.state.download ? (
            <div id='features-settings-presentation-settingspagecontent-div-10-p4ygnt' className="space-y-2 px-4" aria-live="polite">
              <div id='features-settings-presentation-settingspagecontent-div-11-oeojbk' className="flex items-center justify-between text-sm font-semibold text-on-surface">
                <span id='features-settings-presentation-settingspagecontent-text-12-bkgewg'>{otaPercent}%</span>
                <span id='features-settings-presentation-settingspagecontent-text-13-in0r6k' dir="ltr">{formatOtaBytes(otaDownloaded)} / {formatOtaBytes(otaTotal)}</span>
              </div>
              <div id='features-settings-presentation-settingspagecontent-div-14-nwhcv7' className="h-2 overflow-hidden rounded-full bg-surface-variant">
                <div id='features-settings-presentation-settingspagecontent-div-15-pzhtpn' className="h-full bg-primary transition-[width]" style={{ width: `${otaPercent}%` }} />
              </div>
            </div>
          ) : null}
          {ota.error ? <p id='features-settings-presentation-settingspagecontent-text-16-yxtvc9' className="px-4 text-sm text-error">{ota.error}</p> : null}
          <div id='features-settings-presentation-settingspagecontent-div-17-tx1xzq' className="flex flex-wrap items-center gap-2 px-4">
          {/*
            Shown only while a verified release is sitting on disk waiting for
            a launch. Outside that one state there is nothing to restart for,
            so the button does not exist rather than being disabled.
          */}
          {ota.state.pending?.ready ? (
            <button id='features-settings-presentation-settingspagecontent-button-18-0gok89'
              type="button"
              onClick={() => void ota.applyNow()}
              disabled={ota.busy}
              className="asol-control inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary disabled:opacity-60"
            >
              <RotateCcw id='features-settings-presentation-settingspagecontent-rotateccw-19-8zyxrq' className="h-4 w-4" aria-hidden="true" />
              {t("ota.settings.restart")}
            </button>
          ) : null}
          <button id="features-settings-presentation-settingspagecontent-button-20-lfiidj"
            type="button"
            onClick={() => void ota.checkNow()}
            disabled={ota.busy}
            className="asol-control inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            <RefreshCw id='features-settings-presentation-settingspagecontent-refreshcw-21-jvqp82' className={`h-4 w-4 ${ota.busy ? "animate-spin" : ""}`} aria-hidden="true" />
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

      <Link
        href="/settings/notifications"
        className="asol-control flex w-full items-center justify-center rounded-xl border border-outline-variant px-6 py-3 font-semibold text-on-surface"
      >
        {t("settings.notifications.title")}
      </Link>

      {/* Footer actions — restore/clear is a destructive dev-facing reset, visible to super admins only */}
      {isSuperAdmin(session) ? (
        <footer id='features-settings-presentation-settingspagecontent-footer-22-xyqhwg' className="flex flex-col items-center justify-center gap-4 pt-12 md:flex-row-reverse">
          <button id="features-settings-presentation-settingspagecontent-button-23-fzs8yj"
            type="button"
            disabled={clearing}
            className="asol-control flex w-full items-center justify-center gap-2 rounded-xl border-2 border-error/30 bg-gradient-to-r from-error/10 to-error/5 px-6 py-3 font-semibold text-error shadow-lg shadow-error/10 transition-all md:w-auto disabled:opacity-60"
            onClick={handleClearAll}
          >
            <FontAwesomeIcon id='features-settings-presentation-settingspagecontent-fontawesomeicon-24-worr8e' icon={faRotateLeft} className="h-4 w-4" />
            {clearing ? t("settings.clearing") : t("settings.restoreDefaults")}
          </button>
        </footer>
      ) : null}

      {/* Clear Confirmation Dialog */}
      {showClearDialog && (
        <div id='features-settings-presentation-settingspagecontent-div-25-dzjfvm' className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div id='features-settings-presentation-settingspagecontent-div-26-s0untq' className="mx-4 max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            <div id='features-settings-presentation-settingspagecontent-div-27-dbksck' className="mb-4 flex items-center gap-3">
              <div id='features-settings-presentation-settingspagecontent-div-28-1tmesz' className="flex h-12 w-12 items-center justify-center rounded-xl bg-error/20">
                <FontAwesomeIcon id='features-settings-presentation-settingspagecontent-fontawesomeicon-29-ohccwm'
                  icon={faRotateLeft}
                  className="h-6 w-6 text-error"
                />
              </div>
              <h3 id='features-settings-presentation-settingspagecontent-heading-30-bmmufr' className="text-xl font-semibold text-on-surface">
                {t("settings.restoreDefaults")}
              </h3>
            </div>
            <p id='features-settings-presentation-settingspagecontent-text-31-3f93dr' className="mb-6 text-sm text-on-surface-variant">
              {CLEAR_STORAGE_WARNING}
            </p>
            <div id='features-settings-presentation-settingspagecontent-div-32-o0v3dq' className="flex gap-3">
              <button id='features-settings-presentation-settingspagecontent-button-33-vw7rqd'
                type="button"
                onClick={() => setShowClearDialog(false)}
                className="asol-control flex-1 rounded-xl px-4 py-2 font-semibold text-on-surface-variant"
              >
                إلغاء
              </button>
              <button id='features-settings-presentation-settingspagecontent-button-34-vsois6'
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
