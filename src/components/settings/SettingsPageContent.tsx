"use client";

import { Bell, FileText, Globe, Palette, RefreshCw, RotateCcw, Shield } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSun,
  faMoon,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { useAppPreferences, useThemePreferences } from "@/lib/preferences";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  CLEAR_STORAGE_WARNING,
  clearAllClientStorage,
} from "@/lib/storage/client-storage";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useOtaUpdate } from "@/features/ota/hooks/use-ota-update";
import { publicEnv } from "@/core/config/public-env";
import {
  notifications,
  type NotificationPermissionStateName,
} from "@/features/notifications";
import {
  isSpecialtyChatSessionTokenFailure,
  specialtyChatClient,
} from "@/features/specialty-chat";

import {
  type SettingsLocale,
  type SettingsThemeMode,
} from "./settings-types";

export function SettingsPageContent() {
  const { t } = useTranslation();
  const {
    preferences: themePrefs,
    resolvedScheme,
    updatePreferences: updateTheme,
    resetPreferences: resetTheme,
  } = useThemePreferences();
  const {
    preferences: appPrefs,
    updatePreferences: updateApp,
    resetPreferences: resetApp,
  } = useAppPreferences();
  const { session } = useSession();
  const ota = useOtaUpdate();
  const [notificationPlatform, setNotificationPlatform] = React.useState<
    "android" | "ios" | "web"
  >("web");
  const [notificationRuntimeReady, setNotificationRuntimeReady] =
    React.useState(false);
  const isAndroidNotifications = notificationPlatform === "android";
  const isIosNotifications = notificationPlatform === "ios";

  const [statusText, setStatusText] = React.useState("");
  const [webPushStatus, setWebPushStatus] = React.useState("");
  const [webPushBusy, setWebPushBusy] = React.useState(false);
  const [webPushPermission, setWebPushPermission] =
    React.useState<NotificationPermissionStateName>("unsupported");
  const [pushSupported, setPushSupported] = React.useState(false);
  const [androidPushEnabled, setAndroidPushEnabled] = React.useState(false);
  const [androidPushPermission, setAndroidPushPermission] =
    React.useState<string>("unsupported");
  const [clearing, setClearing] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [specialtyRequestsEnabled, setSpecialtyRequestsEnabled] = React.useState(true);
  const [productConversationsEnabled, setProductConversationsEnabled] = React.useState(true);
  const [specialtyPreferenceBusy, setSpecialtyPreferenceBusy] = React.useState(false);
  const [productConversationsBusy, setProductConversationsBusy] = React.useState(false);
  const [pushPreferenceEnabled, setPushPreferenceEnabled] = React.useState(true);
  const [pushPreferenceBusy, setPushPreferenceBusy] = React.useState(false);

  const themeLabels: Record<SettingsThemeMode, string> = {
    light: t("theme.light"),
    dark: t("theme.dark"),
  };

  // One read of the module's diagnostics answers every question this screen
  // asks about the device: which platform it is, whether push can work here,
  // whether this device already opted in, and what the OS currently permits.
  const loadNotificationState = React.useCallback(async () => {
    const diagnostics = await notifications.getDiagnostics();
    setNotificationPlatform(diagnostics.platform);
    setPushSupported(diagnostics.pushSupported);
    setWebPushPermission(diagnostics.permission.state);
    setAndroidPushEnabled(diagnostics.deviceEnabled);
    setAndroidPushPermission(diagnostics.permission.state);
    setNotificationRuntimeReady(true);
  }, []);

  React.useEffect(() => {
    void loadNotificationState();
  }, [loadNotificationState]);

  React.useEffect(() => {
    if (!session?.sessionToken) return;
    void specialtyChatClient
      .preferences(session)
      .then((preferences) => {
        setSpecialtyRequestsEnabled(preferences.specialtyRequestsEnabled);
        setProductConversationsEnabled(preferences.productConversationsEnabled);
      })
      .catch((error) => {
        if (isSpecialtyChatSessionTokenFailure(error)) return;
        console.warn("[Settings] Failed to load chat preferences.", error);
      });
  }, [session]);

  React.useEffect(() => {
    if (!session?.uid) return;
    void notifications
      .getPushPreference({ uid: session.uid, phone: session.phone })
      .then((preference) => setPushPreferenceEnabled(preference.pushEnabled))
      .catch((error) => {
        console.warn("[Settings] Failed to load the push preference.", error);
      });
  }, [session]);

  const updatePushPreference = async (enabled: boolean) => {
    if (!session?.uid || pushPreferenceBusy) return;
    setPushPreferenceBusy(true);
    try {
      const preference = await notifications.setPushPreference({
        uid: session.uid,
        phone: session.phone,
        pushEnabled: enabled,
      });
      setPushPreferenceEnabled(preference.pushEnabled);
      showStatus(
        preference.pushEnabled
          ? "تم تفعيل كل الإشعارات لهذا الحساب."
          : "تم إيقاف كل الإشعارات لهذا الحساب. الأجهزة تبقى مسجّلة كما هي.",
      );
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "تعذر حفظ إعداد الإشعارات.",
      );
    } finally {
      setPushPreferenceBusy(false);
    }
  };

  const updateSpecialtyRequests = async (enabled: boolean) => {
    if (!session?.sessionToken || specialtyPreferenceBusy) return;
    setSpecialtyPreferenceBusy(true);
    try {
      const value = await specialtyChatClient.preferences(session, {
        specialtyRequestsEnabled: enabled,
      });
      setSpecialtyRequestsEnabled(value.specialtyRequestsEnabled);
      showStatus(value.specialtyRequestsEnabled ? "تم تفعيل استقبال طلبات التخصص." : "تم إيقاف استقبال طلبات التخصص.");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "تعذر حفظ إعداد طلبات التخصص.");
    } finally {
      setSpecialtyPreferenceBusy(false);
    }
  };

  const updateProductConversations = async (enabled: boolean) => {
    if (!session?.sessionToken || productConversationsBusy) return;
    setProductConversationsBusy(true);
    try {
      const value = await specialtyChatClient.preferences(session, {
        productConversationsEnabled: enabled,
      });
      setProductConversationsEnabled(value.productConversationsEnabled);
      showStatus(
        value.productConversationsEnabled
          ? "تم السماح بمراسلتك من صفحات ملفك ومنتجاتك."
          : "تم منع بدء محادثات جديدة من صفحات ملفك ومنتجاتك.",
      );
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "تعذر حفظ إعداد المحادثات المباشرة.",
      );
    } finally {
      setProductConversationsBusy(false);
    }
  };

  const showStatus = (message: string) => {
    setStatusText(message);
    window.setTimeout(() => setStatusText(""), 3000);
  };

  const cycleThemeMode = () => {
    const modes: SettingsThemeMode[] = ["light", "dark"];
    const currentIndex = modes.indexOf(themePrefs.themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    updateTheme({ themeMode: modes[nextIndex] });
  };

  const getThemeIcon = () => {
    switch (themePrefs.themeMode) {
      case "light":
        return faSun;
      case "dark":
        return faMoon;
      default:
        return faSun;
    }
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

  const activeThemeLabel = themeLabels[themePrefs.themeMode];
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

  const enableWebPush = async () => {
    if (!session?.uid) {
      setWebPushStatus("يجب تسجيل الدخول لتفعيل إشعارات هذا الجهاز.");
      return;
    }
    setWebPushBusy(true);
    setWebPushStatus("");
    try {
      // Browsers never allow a site to reverse a denied notification
      // permission. Re-check first so this button becomes the recovery path
      // after the user changes the site's permission from the address bar,
      // without calling subscribe() and exposing a technical error string.
      const currentPermission = (await notifications.getPermissionState()).state;
      setWebPushPermission(currentPermission);
      if (currentPermission === "denied" || currentPermission === "blocked") {
        setWebPushStatus(
          t("notifications.permissionPrompt.deniedManual"),
        );
        return;
      }
      await notifications.enableDevice({ uid: session.uid, phone: session.phone });
      await loadNotificationState();
      setWebPushStatus("تم تفعيل إشعارات المتصفح لهذا الجهاز.");
    } catch (error) {
      setWebPushStatus(
        error instanceof Error && error.message === "notificationPermissionDenied"
          ? t("notifications.permissionPrompt.deniedManual")
          : "تعذر تفعيل إشعارات المتصفح.",
      );
    } finally {
      setWebPushBusy(false);
    }
  };

  /**
   * Opens the OS-level notification settings for this app when the platform
   * allows it (Android only — `permissionManager.openSettings()` is
   * unimplemented on iOS and impossible from a browser tab). Where there is
   * no settings screen to reach, this re-checks the permission instead and
   * falls back to the same manual-recovery copy the permission prompt uses.
   */
  const openNotificationSettings = async () => {
    setWebPushBusy(true);
    setWebPushStatus("");
    try {
      const opened = await notifications.openPermissionSettings();
      if (opened) return;
      const state = await notifications.getPermissionState();
      if (isAndroidNotifications || isIosNotifications) {
        setAndroidPushPermission(state.state);
      } else {
        setWebPushPermission(state.state);
      }
      if (state.granted) {
        setWebPushStatus("");
        return;
      }
      setWebPushStatus(t("notifications.permissionPrompt.deniedManual"));
    } catch (error) {
      setWebPushStatus(
        error instanceof Error
          ? error.message
          : "تعذر فتح إعدادات إشعارات النظام.",
      );
    } finally {
      setWebPushBusy(false);
    }
  };

  const enableAndroidPush = async () => {
    if (!session?.uid) {
      setWebPushStatus("يجب تسجيل الدخول لتفعيل إشعارات Android.");
      return;
    }
    setWebPushBusy(true);
    setWebPushStatus("");
    try {
      const permission = await notifications.requestPermission();
      setAndroidPushPermission(permission);
      if (permission !== "granted")
        throw new Error("لم يتم منح إذن الإشعارات.");
      await notifications.registerDevice({
        uid: session.uid,
        phone: session.phone,
      });
      setAndroidPushEnabled(true);
      setWebPushStatus(
        isIosNotifications
          ? "تم تفعيل إشعارات iOS لهذا الجهاز."
          : "تم تفعيل إشعارات Android والنغمة المخصصة لهذا الجهاز.",
      );
    } catch (error) {
      setWebPushStatus(
        error instanceof Error
          ? error.message
          : `تعذر تفعيل إشعارات ${isIosNotifications ? "iOS" : "Android"}.`,
      );
    } finally {
      setWebPushBusy(false);
    }
  };

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

      {/* Language & Region */}
      <section className="mb-12 space-y-6" lang={appPrefs.locale}>
        <div className="asol-settings-section-secondary space-y-8">
          <div className="flex items-center gap-3 px-2">
            <Globe className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">
              {t("settings.languageLabel")}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4">
            <div className="flex w-fit gap-1 rounded-full bg-surface-variant p-1">
              {(["ar", "en"] as SettingsLocale[]).map((locale) => (
                <button
                  key={locale}
                  type="button"
                  className={cn(
                    "asol-control rounded-full px-6 text-xs font-semibold transition-colors",
                    appPrefs.locale === locale
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                  onClick={() => updateApp({ locale })}
                >
                  {locale === "ar" ? t("common.arabic") : t("common.english")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="mb-12 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="asol-settings-section-primary space-y-6">
              <div className="flex items-center gap-3 px-2">
                <Palette className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-on-surface">
                  {t("settings.appearance")}
                </h2>
              </div>
              <div className="flex flex-row items-center justify-center gap-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={cycleThemeMode}
                    className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 transition-all hover:bg-primary/30"
                    aria-label={t("settings.visualTheme")}
                  >
                    <FontAwesomeIcon
                      icon={getThemeIcon()}
                      className="h-7 w-7 text-primary"
                    />
                  </button>
                  <div className="text-center">
                    <h4 className="text-sm font-semibold">
                      {activeThemeLabel}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12 space-y-6">
        <div className="asol-settings-section-secondary space-y-5">
          <div className="flex items-center gap-3 px-2">
            <Bell className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">
              {isAndroidNotifications
                ? "إشعارات Android"
                : isIosNotifications
                  ? "إشعارات iOS"
                  : "إشعارات المتصفح"}
            </h2>
          </div>
          <div className="rounded-xl asol-surface-neutral p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  حالة هذا الجهاز
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  الإذن الحالي:{" "}
                  {(isAndroidNotifications
                    ? androidPushPermission
                    : isIosNotifications
                      ? androidPushPermission
                    : webPushPermission) === "granted"
                    ? "مسموح"
                    : (isAndroidNotifications
                          ? androidPushPermission
                          : isIosNotifications
                            ? androidPushPermission
                          : webPushPermission) === "denied" ||
                        (isAndroidNotifications || isIosNotifications
                          ? androidPushPermission
                          : webPushPermission) === "blocked"
                      ? "مرفوض من إعدادات النظام"
                      : (isAndroidNotifications
                            ? androidPushPermission
                            : isIosNotifications
                              ? androidPushPermission
                            : webPushPermission) === "default" ||
                          androidPushPermission === "prompt"
                        ? "لم يتم السؤال بعد"
                        : "غير مدعوم"}
                  {(isAndroidNotifications || isIosNotifications) && androidPushEnabled
                    ? ` — الجهاز مسجل في ${isIosNotifications ? "APNs" : "FCM"}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isAndroidNotifications || isIosNotifications ? (
                  <>
                    <button
                      type="button"
                      disabled={webPushBusy || androidPushEnabled}
                      onClick={() => void enableAndroidPush()}
                      className="asol-control rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
                    >
                      تفعيل إشعارات {isIosNotifications ? "iOS" : "Android"}
                    </button>
                    <button
                      type="button"
                      disabled={webPushBusy}
                      onClick={() => void openNotificationSettings()}
                      className="asol-control rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-60"
                    >
                      {t("notifications.permissionPrompt.openSettings")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={
                        webPushBusy ||
                        !notificationRuntimeReady ||
                        !pushSupported
                      }
                      onClick={() => void enableWebPush()}
                      className="asol-control rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
                    >
                      {webPushPermission === "denied" ||
                      webPushPermission === "blocked"
                        ? t("notifications.permissionPrompt.recheck")
                        : "تفعيل إشعارات المتصفح"}
                    </button>
                    <button
                      type="button"
                      disabled={webPushBusy}
                      onClick={() => void openNotificationSettings()}
                      className="asol-control rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface disabled:opacity-60"
                    >
                      {t("notifications.permissionPrompt.openSettings")}
                    </button>
                  </>
                )}
              </div>
            </div>
            {webPushStatus ? (
              <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
                {webPushStatus}
              </p>
            ) : null}
            {session?.uid ? (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                <div>
                  <p className="text-sm font-semibold text-on-surface">تفعيل كل الإشعارات</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    المفتاح الرئيسي لهذا الحساب. عند الإيقاف لا يصل أي إشعار من أي نوع — طلبات، رسائل، تحديثات — على أي جهاز مسجّل، دون حذف تسجيل أي جهاز أو إلغاء اشتراكه. يمكن إعادة التفعيل في أي وقت دون إعادة تسجيل شيء.
                  </p>
                </div>
                <ToggleSwitch
                  checked={pushPreferenceEnabled}
                  onChange={(enabled) => void updatePushPreference(enabled)}
                  label="تفعيل كل الإشعارات لهذا الحساب"
                  disabled={pushPreferenceBusy}
                />
              </div>
            ) : null}
            {session?.sessionToken ? (
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface p-4">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">طلبات المشترين حسب التخصص</p>
                    <p className="mt-1 text-xs text-on-surface-variant">السماح للمشترين بإرسال طلبات نصية إلى تخصصاتك. الردود خاصة ولا يراها بقية مقدمي الخدمة.</p>
                  </div>
                  <ToggleSwitch
                    checked={specialtyRequestsEnabled}
                    onChange={(enabled) => void updateSpecialtyRequests(enabled)}
                    label="استقبال طلبات المشترين حسب التخصص"
                    disabled={specialtyPreferenceBusy}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface p-4">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">مراسلة صاحب الصفحة والمنتج</p>
                    <p className="mt-1 text-xs text-on-surface-variant">السماح للمستخدمين ببدء محادثة خاصة معك من صفحة ملفك أو من صفحة أحد منتجاتك. عند الإيقاف لن تبدأ محادثات مباشرة جديدة.</p>
                  </div>
                  <ToggleSwitch
                    checked={productConversationsEnabled}
                    onChange={(enabled) => void updateProductConversations(enabled)}
                    label="السماح بمراسلة صاحب الصفحة والمنتج"
                    disabled={productConversationsBusy}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Legal */}
      <section className="mb-12 space-y-6">
        <div className="asol-settings-section-secondary space-y-5">
          <div className="flex items-center gap-3 px-2">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-on-surface">
              قانوني وسياسات
            </h2>
          </div>
          <div className="rounded-xl asol-surface-neutral p-4">
            <div className="flex flex-col gap-3">
              <a
                href="/privacy-policy"
                className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-surface-variant"
              >
                <span className="text-sm font-semibold text-on-surface">
                  سياسة الخصوصية
                </span>
                <FileText className="h-5 w-5 text-on-surface-variant" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Updates */}
      <section className="mb-12 space-y-6">
        <div className="asol-settings-section-secondary space-y-5">
          <div className="flex items-center gap-3 px-2">
            <RefreshCw className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-on-surface">{t("ota.settings.title")}</h2>
          </div>
          <div className="asol-surface-neutral space-y-4 rounded-xl p-4">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-on-surface-variant">{t("ota.settings.nativeVersion")}</dt>
                <dd className="font-semibold text-on-surface" dir="ltr">{publicEnv.nativeVersion}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("ota.settings.webVersion")}</dt>
                <dd className="font-semibold text-on-surface" dir="ltr">{publicEnv.webBundleVersion}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("ota.settings.lastCheck")}</dt>
                <dd className="font-semibold text-on-surface">
                  {ota.state.lastSuccessfulCheckAt
                    ? new Intl.DateTimeFormat(appPrefs.locale, { dateStyle: "medium", timeStyle: "short" }).format(ota.state.lastSuccessfulCheckAt)
                    : t("ota.settings.never")}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("ota.settings.status")}</dt>
                <dd className="font-semibold text-on-surface">
                  {t(otaStatusKey, {
                    size: formatOtaBytes(
                      ota.progress?.requiredFreeBytes ?? ota.state.requiredFreeBytes ?? 0,
                    ),
                  })}
                </dd>
              </div>
            </dl>
            {otaTotal > 0 && ota.state.download ? (
              <div className="space-y-2" aria-live="polite">
                <div className="flex items-center justify-between text-sm font-semibold text-on-surface">
                  <span>{otaPercent}%</span>
                  <span dir="ltr">{formatOtaBytes(otaDownloaded)} / {formatOtaBytes(otaTotal)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
                  <div className="h-full bg-primary transition-[width]" style={{ width: `${otaPercent}%` }} />
                </div>
              </div>
            ) : null}
            {ota.error ? <p className="text-sm text-error">{ota.error}</p> : null}
            <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </section>

      {/* Footer actions */}
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
