"use client";

import { formatAdminClock } from "@asol/format-core";

import {
  BellRing,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Volume2,
  VolumeX,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import {
  notifications,
  getNotificationTestScenario,
  NOTIFICATION_TEST_SCENARIOS,
  NotificationChannels,
  NotificationContentSources,
  NotificationDeliveryStatuses,
  NotificationSyncStates,
  NotificationTargets,
  NotificationTestScenarioIds,
  NotificationTypes,
  type BroadcastRecipient,
  type NotificationTestResult,
  type NotificationTestScenarioId,
} from "@/features/notifications";
import { DEFAULT_CHANNELS } from '@asol/native-core';
import {
  NOTIFICATION_PERMISSION_LABELS,
  createRequestId,
  formatStoredTestResultStatus,
  formatTestResultStatus,
  notificationTestBatchSizeOptions,
  notificationTestDelayOptions,
  wait,
} from "./notification-tests/notification-test-presentation";
import { uiAttributes } from "@asol/ui-registry-core";

type TestMode = "local" | "push";

interface RuntimeStatus {
  platform: "android" | "ios" | "web";
  permission: string;
  pushSupported: boolean;
  deviceEnabled: boolean;
  recipient: BroadcastRecipient | null;
  centerTestCount: number;
}

interface TestHistoryEntry {
  id: string;
  at: string;
  mode: TestMode;
  scenarioId: NotificationTestScenarioId;
  channelId: string;
  status: string;
  tokenCount: number;
  centerStatus: "saved" | "pending" | "missing";
}

export function SuperAdminNotificationTestsPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<TestMode>("local");
  const [scenarioId, setScenarioId] = useState<NotificationTestScenarioId>(
    NotificationTestScenarioIds.General,
  );
  const [title, setTitle] = useState("اختبار إشعارات ASOL");
  const [body, setBody] = useState(
    "هذا إشعار تجريبي للتحقق من القناة والنغمة المخصصة.",
  );
  const [routeHref, setRouteHref] = useState("/notifications");
  const [delaySeconds, setDelaySeconds] = useState<number>(0);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [remoteResult, setRemoteResult] =
    useState<NotificationTestResult | null>(null);
  const [history, setHistory] = useState<TestHistoryEntry[]>([]);

  const scenario = useMemo(
    () => getNotificationTestScenario(scenarioId) ?? NOTIFICATION_TEST_SCENARIOS[0],
    [scenarioId],
  );
  const channel = useMemo(
    () => DEFAULT_CHANNELS.find((item) => item.id === scenario.channelId),
    [scenario.channelId],
  );

  const refreshStatus = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setStatusBusy(true);
    setMessage("");
    try {
      const [diagnostics, recipients, centerItems] = await Promise.all([
        notifications.getDiagnostics({ uid: session.uid }),
        notifications.listPushRecipients(session),
        notifications.list({ uid: session.uid }),
      ]);
      setStatus({
        platform: diagnostics.platform,
        permission: diagnostics.permission.state,
        pushSupported: diagnostics.pushSupported,
        deviceEnabled: diagnostics.deviceEnabled,
        recipient:
          recipients.recipients.find((item) => item.uid === session.uid) ?? null,
        centerTestCount: centerItems.filter(
          (item) => item.metadata?.notificationTest === true || item.metadata?.notificationTest === "true",
        ).length,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "تعذر قراءة حالة الإشعارات.",
      );
    } finally {
      setStatusBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
    if (!isLoading && authorized) void refreshStatus();
  }, [authorized, isLoading, refreshStatus, router, session]);

  const enableNotifications = async () => {
    if (!session) return;
    setStatusBusy(true);
    setMessage("");
    try {
      const permission = await notifications.requestPermission();
      if (permission !== "granted") {
        setMessage("لم يمنح النظام إذن الإشعارات. افتح إعدادات التطبيق لتفعيله.");
        return;
      }
      await notifications.enableDevice({ uid: session.uid, phone: session.phone });
      setMessage("تم تفعيل الإشعارات وتحديث تسجيل هذا الجهاز.");
      await refreshStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تفعيل الإشعارات.");
    } finally {
      setStatusBusy(false);
    }
  };

  const syncNotificationCenter = async () => {
    if (!session) return;
    setStatusBusy(true);
    try {
      await notifications.importDelivered({ uid: session.uid });
      await refreshStatus();
      setMessage("تمت مزامنة إشعارات Android الموجودة في الشريط مع صفحة الإشعارات.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذرت مزامنة مركز الإشعارات.");
    } finally {
      setStatusBusy(false);
    }
  };

  const addHistory = (
    entry: Omit<TestHistoryEntry, "id" | "at">,
  ) => {
    setHistory((current) => [
      {
        ...entry,
        id: createRequestId(),
        at: formatAdminClock(new Date(), { seconds: true }),
      },
      ...current,
    ].slice(0, 100));
  };

  const runTest = async () => {
    if (!session || busy) return;
    if (!title.trim() || !body.trim()) {
      setMessage("أدخل عنوانًا ونصًا للاختبار.");
      return;
    }
    if (!routeHref.startsWith("/") || routeHref.startsWith("//")) {
      setMessage("الرابط الداخلي يجب أن يبدأ بشرطة مائلة واحدة مثل /notifications.");
      return;
    }

    setBusy(true);
    setMessage("");
    setRemoteResult(null);
    try {
      if (delaySeconds > 0) {
        for (let remaining = delaySeconds; remaining > 0; remaining -= 1) {
          setCountdown(remaining);
          await wait(1_000);
        }
      }
      setCountdown(null);

      if (mode === "local") {
        const permission = await notifications.getPermissionState();
        if (!permission.granted) {
          throw new Error("فعّل إذن الإشعارات قبل إجراء الاختبار المحلي.");
        }
        let savedCount = 0;
        for (let index = 1; index <= batchSize; index += 1) {
          const notificationId = `local-test:${createRequestId()}`;
          const now = new Date().toISOString();
          const suffix = batchSize > 1 ? ` (${index}/${batchSize})` : "";
          const saved = await notifications.sendLocal({
            id: notificationId,
            uid: session.uid,
            type: NotificationTypes.Custom,
            source: NotificationContentSources.Custom,
            title: `${title.trim()}${suffix}`,
            body: body.trim(),
            category: scenario.category,
            priority: scenario.priority,
            channels: [NotificationChannels.InApp, NotificationChannels.AndroidPush],
            targets: [NotificationTargets.Center, NotificationTargets.Badge, NotificationTargets.Popup],
            route: { href: routeHref },
            dedupeKey: notificationId,
            sound: scenario.sound,
            status: NotificationDeliveryStatuses.Pending,
            syncState: NotificationSyncStates.Synced,
            createdAt: now,
            updatedAt: now,
            metadata: {
              source: scenario.source,
              notificationTest: true,
              notificationTestScenario: scenario.id,
              notificationTestBatchIndex: index,
              notificationTestBatchSize: batchSize,
              androidChannelId: scenario.channelId,
            },
          });
          const centerSaved = (await notifications.list({ uid: session.uid }))
            .some((item) => item.id === saved.id);
          if (centerSaved) savedCount += 1;
          addHistory({
            mode,
            scenarioId: scenario.id,
            channelId: scenario.channelId,
            status: formatTestResultStatus(
              centerSaved ? "saved" : "missing",
              index,
              batchSize,
            ),
            tokenCount: 0,
            centerStatus: centerSaved ? "saved" : "missing",
          });
        }
        setMessage(
          savedCount !== batchSize
            ? `فشل حفظ ${batchSize - savedCount} من ${batchSize} إشعارات محلية في صفحة الإشعارات.`
            : scenario.audible
              ? `تم إنشاء وحفظ ${batchSize} من ${batchSize}. يجب سماع النغمة المخصصة.`
              : `تم إنشاء وحفظ ${batchSize} من ${batchSize} إشعارات صامتة دون صوت.`,
        );
      } else {
        if (!session.sessionToken) {
          throw new Error("انتهت جلسة الدخول الآمنة. سجّل الخروج ثم ادخل مرة أخرى.");
        }
        let acceptedCount = 0;
        let centerCount = 0;
        let lastStatus = "failed";
        for (let index = 1; index <= batchSize; index += 1) {
          const suffix = batchSize > 1 ? ` (${index}/${batchSize})` : "";
          const result = await notifications.executeTestScenario({
            identity: {
              uid: session.uid,
              phone: session.phone,
              sessionToken: session.sessionToken,
            },
            requestId: createRequestId(),
            scenarioId: scenario.id,
            title: `${title.trim()}${suffix}`,
            body: body.trim(),
            routeHref,
          });
          setRemoteResult(result);
          const delivery = result.results[0];
          lastStatus = delivery?.status ?? "failed";
          if (["sent", "partial", "queued"].includes(lastStatus)) acceptedCount += 1;
          await wait(1_200);
          const centerSaved = (await notifications.list({ uid: session.uid }))
            .some((item) => item.dedupeKey === result.dedupeKey);
          if (centerSaved) centerCount += 1;
          addHistory({
            mode,
            scenarioId: scenario.id,
            channelId: result.channelId,
            status: formatTestResultStatus(lastStatus, index, batchSize),
            tokenCount: delivery?.tokenCount ?? 0,
            centerStatus: centerSaved ? "saved" : "pending",
          });
        }
        setMessage(
          acceptedCount === batchSize && centerCount === batchSize
            ? `تم قبول وحفظ ${batchSize} من ${batchSize} إشعارات Push متتالية.`
            : lastStatus === "no_tokens"
              ? "لا يوجد رمز Push مسجل لحساب السوبر أدمن. فعّل الجهاز أولًا."
              : lastStatus === "muted"
                ? "حساب السوبر أدمن أوقف كل الإشعارات من الإعدادات. فعّلها أولًا."
                : `اكتملت الدفعة جزئيًا: قُبل ${acceptedCount}/${batchSize} وحُفظ ${centerCount}/${batchSize}.`,
        );
      }
    } catch (error) {
      setCountdown(null);
      setMessage(error instanceof Error ? error.message : "فشل اختبار الإشعار.");
      addHistory({
        mode,
        scenarioId: scenario.id,
        channelId: scenario.channelId,
        status: formatTestResultStatus("failed"),
        tokenCount: 0,
        centerStatus: "missing",
      });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !authorized) {
    return (
      <main {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.main.3-0ItSP0", id: "super-admin.super-admin-notification-tests-page.main.3" })} id="super-admin.super-admin-notification-tests-page.main" className="container px-4 py-8 text-sm text-muted-foreground">
        جاري التحقق من الصلاحيات...
      </main>
    );
  }

  return (
    <main {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.main.4-Yaz0be", id: "super-admin.super-admin-notification-tests-page.main.4" })} id="super-admin.super-admin-notification-tests-page.main.2" className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.header.2-2YkXwg", id: "super-admin.super-admin-notification-tests-page.header.2" })} id="super-admin.super-admin-notification-tests-page.header" className="mb-6 flex items-start gap-3">
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.21-LDMX2b", id: "super-admin.super-admin-notification-tests-page.div.21" })} id="super-admin.super-admin-notification-tests-page.div" className="rounded-xl bg-primary/10 p-3 text-primary">
          <BellRing id="super-admin.super-admin-notification-tests-page.bell-ring" className="h-6 w-6" />
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.22-Y4h5iK", id: "super-admin.super-admin-notification-tests-page.div.22" })} id="super-admin.super-admin-notification-tests-page.div.2">
          <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.10-76sKPa", id: "super-admin.super-admin-notification-tests-page.p.10" })} id="super-admin.super-admin-notification-tests-page.p" className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.h1.2-g1kY0X", id: "super-admin.super-admin-notification-tests-page.h1.2" })} id="super-admin.super-admin-notification-tests-page.h1" className="text-2xl font-bold">اختبارات الإشعارات</h1>
          <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.11-8Nl50d", id: "super-admin.super-admin-notification-tests-page.p.11" })} id="super-admin.super-admin-notification-tests-page.p.2" className="mt-1 text-sm text-muted-foreground">
            اختبر القنوات والنغمة محليًا أو عبر المسار الحقيقي للخادم وFCM. اختبار Push مقيّد بحساب السوبر أدمن فقط.
          </p>
        </div>
      </header>

      {message ? (
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.23-I4AS4n", id: "super-admin.super-admin-notification-tests-page.div.23" })} id="super-admin.super-admin-notification-tests-page.div.3" className="mb-5 rounded-lg border bg-card px-4 py-3 text-sm" role="status">
          {message}
        </div>
      ) : null}

      <section {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.section.5-Xw03NG", id: "super-admin.super-admin-notification-tests-page.section.5" })} id="super-admin.super-admin-notification-tests-page.section" className="mb-5 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.24-qPDTA6", id: "super-admin.super-admin-notification-tests-page.div.24" })} id="super-admin.super-admin-notification-tests-page.div.4" className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.25-z0N3KL", id: "super-admin.super-admin-notification-tests-page.div.25" })} id="super-admin.super-admin-notification-tests-page.div.5" className="flex items-center gap-2">
            <Smartphone id="super-admin.super-admin-notification-tests-page.smartphone" className="h-5 w-5 text-primary" />
            <h2 {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.h2.6-F790A7", id: "super-admin.super-admin-notification-tests-page.h2.6" })} id="super-admin.super-admin-notification-tests-page.h2" className="font-semibold">حالة الجهاز والتسجيل</h2>
          </div>
          <Button id="super-admin.super-admin-notification-tests-page.button" ui={{ uid: "super-admin.notification-tests.refresh-status-81VXDC", id: "super-admin.notification-tests.refresh-status", kind: "action", action: "refresh-status", part: "status" }} variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={statusBusy}>
            {statusBusy ? <Loader2 id="super-admin.super-admin-notification-tests-page.loader2" className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw id="super-admin.super-admin-notification-tests-page.refresh-cw" className="me-2 h-4 w-4" />}
            تحديث الحالة
          </Button>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.26-r6PcmS", id: "super-admin.super-admin-notification-tests-page.div.26" })} id="super-admin.super-admin-notification-tests-page.div.6" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatusCard id="super-admin.super-admin-notification-tests-page.status-card" label="المنصة" value={status?.platform ?? "—"} ok={status?.platform === "android" || status?.platform === "ios"} />
          <StatusCard id="super-admin.super-admin-notification-tests-page.status-card.2" label="إذن الإشعارات" value={NOTIFICATION_PERMISSION_LABELS[status?.permission ?? ""] ?? status?.permission ?? "—"} ok={status?.permission === "granted"} />
          <StatusCard id="super-admin.super-admin-notification-tests-page.status-card.3" label="Push مدعوم" value={status?.pushSupported ? "نعم" : "لا"} ok={Boolean(status?.pushSupported)} />
          <StatusCard id="super-admin.super-admin-notification-tests-page.status-card.4" label="الجهاز مفعّل" value={status?.deviceEnabled ? "نعم" : "لا"} ok={Boolean(status?.deviceEnabled)} />
          <StatusCard id="super-admin.super-admin-notification-tests-page.status-card.5" label="رموز الحساب" value={String(status?.recipient?.tokenCount ?? 0)} ok={Boolean(status?.recipient?.tokenCount)} />
          <StatusCard id="super-admin.super-admin-notification-tests-page.status-card.6" label="اختبارات محفوظة" value={String(status?.centerTestCount ?? 0)} ok={Boolean(status?.centerTestCount)} />
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.27-YGQD5M", id: "super-admin.super-admin-notification-tests-page.div.27" })} id="super-admin.super-admin-notification-tests-page.div.7" className="mt-4 flex flex-wrap gap-2">
          <Button id="super-admin.super-admin-notification-tests-page.button.2" ui={{ uid: "super-admin.notification-tests.enable-aam1RE", id: "super-admin.notification-tests.enable", kind: "action", action: "enable-notifications", part: "status" }} onClick={() => void enableNotifications()} disabled={statusBusy}>
            <ShieldCheck id="super-admin.super-admin-notification-tests-page.shield-check" className="me-2 h-4 w-4" />
            تفعيل أو إعادة تسجيل الجهاز
          </Button>
          <Button id="super-admin.super-admin-notification-tests-page.button.3" ui={{ uid: "super-admin.notification-tests.open-settings-R5Ypn9", id: "super-admin.notification-tests.open-settings", kind: "action", action: "open-permission-settings", part: "status" }} variant="outline" onClick={() => void notifications.openPermissionSettings()}>
            <ExternalLink id="super-admin.super-admin-notification-tests-page.external-link" className="me-2 h-4 w-4" />
            فتح إعدادات التطبيق
          </Button>
          <Button id="super-admin.super-admin-notification-tests-page.button.4" ui={{ uid: "super-admin.notification-tests.sync-center-LOl9KH", id: "super-admin.notification-tests.sync-center", kind: "action", action: "sync-notification-center", part: "status" }} variant="outline" onClick={() => void syncNotificationCenter()} disabled={statusBusy}>
            <RefreshCw id="super-admin.super-admin-notification-tests-page.refresh-cw.2" className="me-2 h-4 w-4" />
            مزامنة الشريط مع صفحة الإشعارات
          </Button>
        </div>
        {status?.recipient ? (
          <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.12-XbXJ6H", id: "super-admin.super-admin-notification-tests-page.p.12" })} id="super-admin.super-admin-notification-tests-page.p.3" className="mt-3 text-xs text-muted-foreground">
            المنصات المسجلة: {status.recipient.platforms.join("، ") || "—"} · المزودون: {status.recipient.providers.join("، ") || "—"}. اختبار Push يصل إلى الأجهزة المسجلة لهذا الحساب فقط.
          </p>
        ) : null}
      </section>

      <section {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.section.6-1CWlfH", id: "super-admin.super-admin-notification-tests-page.section.6" })} id="super-admin.super-admin-notification-tests-page.section.2" className="mb-5 rounded-xl border bg-card p-4">
        <h2 {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.h2.7-tB29Z8", id: "super-admin.super-admin-notification-tests-page.h2.7" })} id="super-admin.super-admin-notification-tests-page.h2.2" className="mb-4 font-semibold">اختر قناة الاختبار</h2>
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.28-Z0VGgz", id: "super-admin.super-admin-notification-tests-page.div.28" })} id="super-admin.super-admin-notification-tests-page.div.8" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NOTIFICATION_TEST_SCENARIOS.map((item) => (
            <button
              key={item.id} {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.button.8-0V5IVf", id: "super-admin.super-admin-notification-tests-page.button.8" })}
              type="button"
              onClick={() => setScenarioId(item.id)}
              className={`rounded-xl border p-4 text-start transition-colors ${scenarioId === item.id ? "border-primary bg-primary/10" : ""}`}
            >
              <span {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.span-oLIBR3", id: "super-admin.super-admin-notification-tests-page.span" })} className="flex items-center gap-2 font-semibold">
                {item.audible ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {item.label}
              </span>
              <span {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.span.2-jB5TwL", id: "super-admin.super-admin-notification-tests-page.span.2" })} className="mt-2 block text-xs text-muted-foreground">{item.description}</span>
              <code className="mt-2 block text-xs" dir="ltr">{item.channelId}</code>
            </button>
          ))}
        </div>
      </section>

      <section {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.section.7-o4sF7J", id: "super-admin.super-admin-notification-tests-page.section.7" })} id="super-admin.super-admin-notification-tests-page.section.3" className="mb-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.29-N4Rd09", id: "super-admin.super-admin-notification-tests-page.div.29" })} id="super-admin.super-admin-notification-tests-page.div.9" className="rounded-xl border bg-card p-4">
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.h2.8-Dn38oe", id: "super-admin.super-admin-notification-tests-page.h2.8" })} id="super-admin.super-admin-notification-tests-page.h2.3" className="mb-4 font-semibold">إعداد الاختبار</h2>
          <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.30-9Yq4Tw", id: "super-admin.super-admin-notification-tests-page.div.30" })} id="super-admin.super-admin-notification-tests-page.div.10" className="grid gap-4">
            <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.31-AMR60v", id: "super-admin.super-admin-notification-tests-page.div.31" })} id="super-admin.super-admin-notification-tests-page.div.11" className="grid grid-cols-2 gap-2">
              <Button id="super-admin.super-admin-notification-tests-page.button.5" ui={{ uid: "super-admin.notification-tests.mode-local-Mb7X2H", id: "super-admin.notification-tests.mode-local", kind: "action", action: "select-local-mode", part: "mode" }} type="button" variant={mode === "local" ? "default" : "outline"} onClick={() => setMode("local")}>
                <Smartphone id="super-admin.super-admin-notification-tests-page.smartphone.2" className="me-2 h-4 w-4" />اختبار محلي
              </Button>
              <Button id="super-admin.super-admin-notification-tests-page.button.6" ui={{ uid: "super-admin.notification-tests.mode-push-Jf2C2A", id: "super-admin.notification-tests.mode-push", kind: "action", action: "select-push-mode", part: "mode" }} type="button" variant={mode === "push" ? "default" : "outline"} onClick={() => setMode("push")}>
                <Wifi id="super-admin.super-admin-notification-tests-page.wifi" className="me-2 h-4 w-4" />Push حقيقي
              </Button>
            </div>
            <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.32-7itw0E", id: "super-admin.super-admin-notification-tests-page.div.32" })} id="super-admin.super-admin-notification-tests-page.div.12" className="space-y-2">
              <Label id="super-admin.super-admin-notification-tests-page.label" htmlFor="notification-test-title">العنوان</Label>
              <Input ui={{ uid: "super-admin.notification-tests.title-6ucZ8Z", id: "super-admin.notification-tests.title", kind: "field", part: "form" }} id="notification-test-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.33-Uh2UQk", id: "super-admin.super-admin-notification-tests-page.div.33" })} id="super-admin.super-admin-notification-tests-page.div.13" className="space-y-2">
              <Label id="super-admin.super-admin-notification-tests-page.label.2" htmlFor="notification-test-body">النص</Label>
              <Textarea ui={{ uid: "super-admin.notification-tests.body-ALXBj2", id: "super-admin.notification-tests.body", kind: "field", part: "form" }} id="notification-test-body" value={body} maxLength={1000} rows={4} onChange={(event) => setBody(event.target.value)} />
            </div>
            <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.34-D0p8Gp", id: "super-admin.super-admin-notification-tests-page.div.34" })} id="super-admin.super-admin-notification-tests-page.div.14" className="space-y-2">
              <Label id="super-admin.super-admin-notification-tests-page.label.3" htmlFor="notification-test-route">الرابط الداخلي</Label>
              <Input ui={{ uid: "super-admin.notification-tests.route-02cmBT", id: "super-admin.notification-tests.route", kind: "field", part: "form" }} id="notification-test-route" value={routeHref} dir="ltr" onChange={(event) => setRouteHref(event.target.value)} />
            </div>
            <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.35-lQhU02", id: "super-admin.super-admin-notification-tests-page.div.35" })} id="super-admin.super-admin-notification-tests-page.div.15" className="space-y-2">
              <Label id="super-admin.super-admin-notification-tests-page.label.4" htmlFor="notification-test-batch-size">عدد الإشعارات المتتالية</Label>
              <select {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.select-102SSw", id: "super-admin.super-admin-notification-tests-page.select" })} id="notification-test-batch-size" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))}>
                {notificationTestBatchSizeOptions.map((count) => <option key={count} {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.option-8Kk3yj", id: "super-admin.super-admin-notification-tests-page.option" })} value={count}>{count === 1 ? "إشعار واحد" : `${count} إشعارات متتالية`}</option>)}
              </select>
            </div>
            <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.36-KQ7IWI", id: "super-admin.super-admin-notification-tests-page.div.36" })} id="super-admin.super-admin-notification-tests-page.div.16" className="space-y-2">
              <Label id="super-admin.super-admin-notification-tests-page.label.5" htmlFor="notification-test-delay">التأخير</Label>
              <select {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.select.2-YD2pXj", id: "super-admin.super-admin-notification-tests-page.select.2" })} id="notification-test-delay" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={delaySeconds} onChange={(event) => setDelaySeconds(Number(event.target.value))}>
                {notificationTestDelayOptions.map((seconds) => <option key={seconds} {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.option.2-rArPd5", id: "super-admin.super-admin-notification-tests-page.option.2" })} value={seconds}>{seconds === 0 ? "فوري" : `بعد ${seconds} ثوانٍ`}</option>)}
              </select>
              <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.13-BVD7uS", id: "super-admin.super-admin-notification-tests-page.p.13" })} id="super-admin.super-admin-notification-tests-page.p.4" className="text-xs text-muted-foreground">استخدم التأخير لتضع التطبيق في الخلفية أو تقفل الشاشة. لا تغلق التطبيق قبل أن ينتهي العد التنازلي.</p>
            </div>
            <Button id="super-admin.super-admin-notification-tests-page.button.7" ui={{ uid: "super-admin.notification-tests.run-xc3MkQ", id: "super-admin.notification-tests.run", kind: "action", action: "run-test", part: "submit" }} onClick={() => void runTest()} disabled={busy}>
              {busy ? <Loader2 id="super-admin.super-admin-notification-tests-page.loader2.2" className="me-2 h-4 w-4 animate-spin" /> : <Send id="super-admin.super-admin-notification-tests-page.send" className="me-2 h-4 w-4" />}
              {countdown !== null ? `الإرسال بعد ${countdown}` : mode === "local" ? "تشغيل الاختبار المحلي" : "إرسال Push إلى حسابي"}
            </Button>
          </div>
        </div>

        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.37-2e4Dmj", id: "super-admin.super-admin-notification-tests-page.div.37" })} id="super-admin.super-admin-notification-tests-page.div.17" className="rounded-xl border bg-card p-4">
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.h2.9-rlzwN2", id: "super-admin.super-admin-notification-tests-page.h2.9" })} id="super-admin.super-admin-notification-tests-page.h2.4" className="mb-4 font-semibold">المتوقع</h2>
          <dl className="space-y-3 text-sm">
            <Detail id="super-admin.super-admin-notification-tests-page.detail" label="القناة" value={scenario.channelId} mono />
            <Detail id="super-admin.super-admin-notification-tests-page.detail.2" label="الأهمية" value={String(channel?.importance ?? "—")} />
            <Detail id="super-admin.super-admin-notification-tests-page.detail.3" label="الصوت" value={scenario.audible ? "custom_notification.mp3" : "بدون صوت"} />
            <Detail id="super-admin.super-admin-notification-tests-page.detail.4" label="الاهتزاز" value={channel?.vibration ? "مفعّل" : "متوقف"} />
            <Detail id="super-admin.super-admin-notification-tests-page.detail.5" label="الفئة" value={scenario.category} />
            <Detail id="super-admin.super-admin-notification-tests-page.detail.6" label="الأولوية" value={scenario.priority} />
          </dl>
          {remoteResult ? (
            <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.38-8LMB6K", id: "super-admin.super-admin-notification-tests-page.div.38" })} id="super-admin.super-admin-notification-tests-page.div.18" className="mt-5 rounded-lg border bg-muted/40 p-3 text-sm">
              <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.14-U0LfGP", id: "super-admin.super-admin-notification-tests-page.p.14" })} id="super-admin.super-admin-notification-tests-page.p.5" className="flex items-center gap-2 font-semibold"><CheckCircle2 id="super-admin.super-admin-notification-tests-page.check-circle2" className="h-4 w-4 text-primary" />نتيجة Push</p>
              <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.15-MbN3Zt", id: "super-admin.super-admin-notification-tests-page.p.15" })} id="super-admin.super-admin-notification-tests-page.p.6" className="mt-2">الحالة: <strong>{formatTestResultStatus(remoteResult.results[0]?.status ?? "failed")}</strong></p>
              <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.16-N1RBfV", id: "super-admin.super-admin-notification-tests-page.p.16" })} id="super-admin.super-admin-notification-tests-page.p.7">الرموز: <strong>{remoteResult.results[0]?.tokenCount ?? 0}</strong></p>
              <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.17-C2BNTG", id: "super-admin.super-admin-notification-tests-page.p.17" })} id="super-admin.super-admin-notification-tests-page.p.8" className="break-all" dir="ltr">{remoteResult.dedupeKey}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.section.8-q7Z1EM", id: "super-admin.super-admin-notification-tests-page.section.8" })} id="super-admin.super-admin-notification-tests-page.section.4" className="rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.39-J4AIST", id: "super-admin.super-admin-notification-tests-page.div.39" })} id="super-admin.super-admin-notification-tests-page.div.19" className="mb-4 flex items-center gap-2"><Clock3 id="super-admin.super-admin-notification-tests-page.clock3" className="h-5 w-5 text-primary" /><h2 {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.h2.10-i4RM0X", id: "super-admin.super-admin-notification-tests-page.h2.10" })} id="super-admin.super-admin-notification-tests-page.h2.5" className="font-semibold">آخر اختبارات هذه الجلسة</h2></div>
        {history.length === 0 ? <p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.18-DF0FYR", id: "super-admin.super-admin-notification-tests-page.p.18" })} id="super-admin.super-admin-notification-tests-page.p.9" className="text-sm text-muted-foreground">لم يُجرَ أي اختبار بعد.</p> : (
          <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.40-gL08YP", id: "super-admin.super-admin-notification-tests-page.div.40" })} id="super-admin.super-admin-notification-tests-page.div.20" className="overflow-x-auto">
            <table {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.table.2-x8QDox", id: "super-admin.super-admin-notification-tests-page.table.2" })} id="super-admin.super-admin-notification-tests-page.table" className="w-full min-w-[680px] text-sm">
              <thead {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.thead.2-K0k5FK", id: "super-admin.super-admin-notification-tests-page.thead.2" })} id="super-admin.super-admin-notification-tests-page.thead"><tr {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.tr.2-pQ93Kz", id: "super-admin.super-admin-notification-tests-page.tr.2" })} id="super-admin.super-admin-notification-tests-page.tr" className="border-b text-muted-foreground"><th {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.th.8-Zm3Ia7", id: "super-admin.super-admin-notification-tests-page.th.8" })} id="super-admin.super-admin-notification-tests-page.th" className="p-2 text-start">الوقت</th><th {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.th.9-KPAV6T", id: "super-admin.super-admin-notification-tests-page.th.9" })} id="super-admin.super-admin-notification-tests-page.th.2" className="p-2 text-start">النوع</th><th {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.th.10-Iqz8ZT", id: "super-admin.super-admin-notification-tests-page.th.10" })} id="super-admin.super-admin-notification-tests-page.th.3" className="p-2 text-start">السيناريو</th><th {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.th.11-dUr7ju", id: "super-admin.super-admin-notification-tests-page.th.11" })} id="super-admin.super-admin-notification-tests-page.th.4" className="p-2 text-start">القناة</th><th {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.th.12-HseC6O", id: "super-admin.super-admin-notification-tests-page.th.12" })} id="super-admin.super-admin-notification-tests-page.th.5" className="p-2 text-start">النتيجة</th><th {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.th.13-qTT7E5", id: "super-admin.super-admin-notification-tests-page.th.13" })} id="super-admin.super-admin-notification-tests-page.th.6" className="p-2 text-start">المركز</th><th {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.th.14-WE3vG6", id: "super-admin.super-admin-notification-tests-page.th.14" })} id="super-admin.super-admin-notification-tests-page.th.7" className="p-2 text-start">الرموز</th></tr></thead>
              <tbody {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.tbody.2-8UN6Bg", id: "super-admin.super-admin-notification-tests-page.tbody.2" })} id="super-admin.super-admin-notification-tests-page.tbody">{history.map((item) => <tr key={item.id} {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.tr.3-GA523B", id: "super-admin.super-admin-notification-tests-page.tr.3" })} className="border-b last:border-0"><td {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.td-g1YD5Y", id: "super-admin.super-admin-notification-tests-page.td" })} className="p-2">{item.at}</td><td {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.td.2-wFG5iL", id: "super-admin.super-admin-notification-tests-page.td.2" })} className="p-2">{item.mode === "local" ? "محلي" : "Push"}</td><td {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.td.3-WMA9Wc", id: "super-admin.super-admin-notification-tests-page.td.3" })} className="p-2">{getNotificationTestScenario(item.scenarioId)?.label}</td><td {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.td.4-D3Vy78", id: "super-admin.super-admin-notification-tests-page.td.4" })} className="p-2 font-mono text-xs" dir="ltr">{item.channelId}</td><td {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.td.5-j77UmL", id: "super-admin.super-admin-notification-tests-page.td.5" })} className="p-2">{formatStoredTestResultStatus(item.status)}</td><td {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.td.6-Gxs4oK", id: "super-admin.super-admin-notification-tests-page.td.6" })} className="p-2">{item.centerStatus === "saved" ? "محفوظ" : item.centerStatus === "pending" ? "ينتظر المزامنة" : "مفقود"}</td><td {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.td.7-VQG0Gc", id: "super-admin.super-admin-notification-tests-page.td.7" })} className="p-2">{item.tokenCount}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusCard({ id, label, value, ok }: { label: string; value: string; ok: boolean } & { id?: string }) {
  return <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.41-fcu2Pu", id: "super-admin.super-admin-notification-tests-page.div.41" })} id={id} className="rounded-lg border p-3"><p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.19-R3yJK9", id: "super-admin.super-admin-notification-tests-page.p.19" })} className="text-xs text-muted-foreground">{label}</p><p {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.p.20-0ERGVL", id: "super-admin.super-admin-notification-tests-page.p.20" })} className={`mt-1 font-semibold ${ok ? "text-emerald-600" : "text-amber-600"}`}>{value}</p></div>;
}

function Detail({ id, label, value, mono = false }: { label: string; value: string; mono?: boolean } & { id?: string }) {
  return <div {...uiAttributes({ uid: "super-admin.super-admin-notification-tests-page.div.42-JuB8D8", id: "super-admin.super-admin-notification-tests-page.div.42" })} id={id} className="flex items-start justify-between gap-3 border-b pb-2"><dt className="text-muted-foreground">{label}</dt><dd className={mono ? "font-mono text-xs" : "font-medium"} dir={mono ? "ltr" : undefined}>{value}</dd></div>;
}
