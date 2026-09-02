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
      <main id='features-super-admin-presentation-superadminnotificationtestspage-main-1-x008ex' className="container px-4 py-8 text-sm text-muted-foreground">
        جاري التحقق من الصلاحيات...
      </main>
    );
  }

  return (
    <main id='features-super-admin-presentation-superadminnotificationtestspage-main-2-5pzwg7' className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header id='features-super-admin-presentation-superadminnotificationtestspage-header-3-5elyig' className="mb-6 flex items-start gap-3">
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-4-jbgbvd' className="rounded-xl bg-primary/10 p-3 text-primary">
          <BellRing id='features-super-admin-presentation-superadminnotificationtestspage-bellring-5-lkznka' className="h-6 w-6" />
        </div>
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-6-96kdt1'>
          <p id='features-super-admin-presentation-superadminnotificationtestspage-text-7-pokacl' className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 id='features-super-admin-presentation-superadminnotificationtestspage-heading-8-b556z1' className="text-2xl font-bold">اختبارات الإشعارات</h1>
          <p id='features-super-admin-presentation-superadminnotificationtestspage-text-9-rbl8hx' className="mt-1 text-sm text-muted-foreground">
            اختبر القنوات والنغمة محليًا أو عبر المسار الحقيقي للخادم وFCM. اختبار Push مقيّد بحساب السوبر أدمن فقط.
          </p>
        </div>
      </header>

      {message ? (
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-10-o0okmn' className="mb-5 rounded-lg border bg-card px-4 py-3 text-sm" role="status">
          {message}
        </div>
      ) : null}

      <section id='features-super-admin-presentation-superadminnotificationtestspage-section-11-rusbwt' className="mb-5 rounded-xl border bg-card p-4">
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-12-16iuk4' className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div id='features-super-admin-presentation-superadminnotificationtestspage-div-13-llgwpm' className="flex items-center gap-2">
            <Smartphone id='features-super-admin-presentation-superadminnotificationtestspage-smartphone-14-gyltij' className="h-5 w-5 text-primary" />
            <h2 id='features-super-admin-presentation-superadminnotificationtestspage-heading-15-q3p0kz' className="font-semibold">حالة الجهاز والتسجيل</h2>
          </div>
          <Button id='features-super-admin-presentation-superadminnotificationtestspage-button-16-icdlvy' variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={statusBusy}>
            {statusBusy ? <Loader2 id='features-super-admin-presentation-superadminnotificationtestspage-loader2-17-advsze' className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw id='features-super-admin-presentation-superadminnotificationtestspage-refreshcw-18-vayasb' className="me-2 h-4 w-4" />}
            تحديث الحالة
          </Button>
        </div>
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-19-k5eyy8' className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatusCard id='features-super-admin-presentation-superadminnotificationtestspage-statuscard-20-sgsbow' label="المنصة" value={status?.platform ?? "—"} ok={status?.platform === "android" || status?.platform === "ios"} />
          <StatusCard id='features-super-admin-presentation-superadminnotificationtestspage-statuscard-21-o4uar9' label="إذن الإشعارات" value={NOTIFICATION_PERMISSION_LABELS[status?.permission ?? ""] ?? status?.permission ?? "—"} ok={status?.permission === "granted"} />
          <StatusCard id='features-super-admin-presentation-superadminnotificationtestspage-statuscard-22-ctgb5j' label="Push مدعوم" value={status?.pushSupported ? "نعم" : "لا"} ok={Boolean(status?.pushSupported)} />
          <StatusCard id='features-super-admin-presentation-superadminnotificationtestspage-statuscard-23-nk0eow' label="الجهاز مفعّل" value={status?.deviceEnabled ? "نعم" : "لا"} ok={Boolean(status?.deviceEnabled)} />
          <StatusCard id='features-super-admin-presentation-superadminnotificationtestspage-statuscard-24-hpflpw' label="رموز الحساب" value={String(status?.recipient?.tokenCount ?? 0)} ok={Boolean(status?.recipient?.tokenCount)} />
          <StatusCard id='features-super-admin-presentation-superadminnotificationtestspage-statuscard-25-rmswe0' label="اختبارات محفوظة" value={String(status?.centerTestCount ?? 0)} ok={Boolean(status?.centerTestCount)} />
        </div>
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-26-wtxb2m' className="mt-4 flex flex-wrap gap-2">
          <Button id='features-super-admin-presentation-superadminnotificationtestspage-button-27-on7hao' onClick={() => void enableNotifications()} disabled={statusBusy}>
            <ShieldCheck id='features-super-admin-presentation-superadminnotificationtestspage-shieldcheck-28-c5cu0f' className="me-2 h-4 w-4" />
            تفعيل أو إعادة تسجيل الجهاز
          </Button>
          <Button id='features-super-admin-presentation-superadminnotificationtestspage-button-29-ttss9y' variant="outline" onClick={() => void notifications.openPermissionSettings()}>
            <ExternalLink id='features-super-admin-presentation-superadminnotificationtestspage-externallink-30-fvggma' className="me-2 h-4 w-4" />
            فتح إعدادات التطبيق
          </Button>
          <Button id='features-super-admin-presentation-superadminnotificationtestspage-button-31-y26czi' variant="outline" onClick={() => void syncNotificationCenter()} disabled={statusBusy}>
            <RefreshCw id='features-super-admin-presentation-superadminnotificationtestspage-refreshcw-32-levt9x' className="me-2 h-4 w-4" />
            مزامنة الشريط مع صفحة الإشعارات
          </Button>
        </div>
        {status?.recipient ? (
          <p id='features-super-admin-presentation-superadminnotificationtestspage-text-33-ifhvua' className="mt-3 text-xs text-muted-foreground">
            المنصات المسجلة: {status.recipient.platforms.join("، ") || "—"} · المزودون: {status.recipient.providers.join("، ") || "—"}. اختبار Push يصل إلى الأجهزة المسجلة لهذا الحساب فقط.
          </p>
        ) : null}
      </section>

      <section id='features-super-admin-presentation-superadminnotificationtestspage-section-34-c5vhzb' className="mb-5 rounded-xl border bg-card p-4">
        <h2 id='features-super-admin-presentation-superadminnotificationtestspage-heading-35-dlor1o' className="mb-4 font-semibold">اختر قناة الاختبار</h2>
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-36-oukqdu' className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NOTIFICATION_TEST_SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScenarioId(item.id)}
              className={`rounded-xl border p-4 text-start transition-colors ${scenarioId === item.id ? "border-primary bg-primary/10" : ""}`}
            >
              <span className="flex items-center gap-2 font-semibold">
                {item.audible ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {item.label}
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">{item.description}</span>
              <code className="mt-2 block text-xs" dir="ltr">{item.channelId}</code>
            </button>
          ))}
        </div>
      </section>

      <section id='features-super-admin-presentation-superadminnotificationtestspage-section-37-hmutkh' className="mb-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-38-d4yftb' className="rounded-xl border bg-card p-4">
          <h2 id='features-super-admin-presentation-superadminnotificationtestspage-heading-39-jpjo1k' className="mb-4 font-semibold">إعداد الاختبار</h2>
          <div id='features-super-admin-presentation-superadminnotificationtestspage-div-40-lgelrs' className="grid gap-4">
            <div id='features-super-admin-presentation-superadminnotificationtestspage-div-41-3y3ce1' className="grid grid-cols-2 gap-2">
              <Button id='features-super-admin-presentation-superadminnotificationtestspage-button-42-rvujyc' type="button" variant={mode === "local" ? "default" : "outline"} onClick={() => setMode("local")}>
                <Smartphone id='features-super-admin-presentation-superadminnotificationtestspage-smartphone-43-j7pavu' className="me-2 h-4 w-4" />اختبار محلي
              </Button>
              <Button id='features-super-admin-presentation-superadminnotificationtestspage-button-44-lafhbm' type="button" variant={mode === "push" ? "default" : "outline"} onClick={() => setMode("push")}>
                <Wifi id='features-super-admin-presentation-superadminnotificationtestspage-wifi-45-f9ynjp' className="me-2 h-4 w-4" />Push حقيقي
              </Button>
            </div>
            <div id='features-super-admin-presentation-superadminnotificationtestspage-div-46-ivdovj' className="space-y-2">
              <Label id='features-super-admin-presentation-superadminnotificationtestspage-label-47-taz3hh' htmlFor='features-super-admin-presentation-superadminnotificationtestspage-input-48-vyykqp'>العنوان</Label>
              <Input id='features-super-admin-presentation-superadminnotificationtestspage-input-48-vyykqp' value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div id='features-super-admin-presentation-superadminnotificationtestspage-div-49-u3o8wc' className="space-y-2">
              <Label id='features-super-admin-presentation-superadminnotificationtestspage-label-50-hqp8el' htmlFor='features-super-admin-presentation-superadminnotificationtestspage-textarea-51-qn7pqv'>النص</Label>
              <Textarea id='features-super-admin-presentation-superadminnotificationtestspage-textarea-51-qn7pqv' value={body} maxLength={1000} rows={4} onChange={(event) => setBody(event.target.value)} />
            </div>
            <div id='features-super-admin-presentation-superadminnotificationtestspage-div-52-qe4ryj' className="space-y-2">
              <Label id='features-super-admin-presentation-superadminnotificationtestspage-label-53-mxsz9i' htmlFor='features-super-admin-presentation-superadminnotificationtestspage-input-54-ycc2z8'>الرابط الداخلي</Label>
              <Input id='features-super-admin-presentation-superadminnotificationtestspage-input-54-ycc2z8' value={routeHref} dir="ltr" onChange={(event) => setRouteHref(event.target.value)} />
            </div>
            <div id='features-super-admin-presentation-superadminnotificationtestspage-div-55-9rilds' className="space-y-2">
              <Label id='features-super-admin-presentation-superadminnotificationtestspage-label-56-in9cmm' htmlFor='features-super-admin-presentation-superadminnotificationtestspage-select-57-z2xjgv'>عدد الإشعارات المتتالية</Label>
              <select id='features-super-admin-presentation-superadminnotificationtestspage-select-57-z2xjgv' className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))}>
                {notificationTestBatchSizeOptions.map((count) => <option key={count} value={count}>{count === 1 ? "إشعار واحد" : `${count} إشعارات متتالية`}</option>)}
              </select>
            </div>
            <div id='features-super-admin-presentation-superadminnotificationtestspage-div-58-hvrgba' className="space-y-2">
              <Label id='features-super-admin-presentation-superadminnotificationtestspage-label-59-wlmbcb' htmlFor='features-super-admin-presentation-superadminnotificationtestspage-select-60-y7klfm'>التأخير</Label>
              <select id='features-super-admin-presentation-superadminnotificationtestspage-select-60-y7klfm' className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={delaySeconds} onChange={(event) => setDelaySeconds(Number(event.target.value))}>
                {notificationTestDelayOptions.map((seconds) => <option key={seconds} value={seconds}>{seconds === 0 ? "فوري" : `بعد ${seconds} ثوانٍ`}</option>)}
              </select>
              <p id='features-super-admin-presentation-superadminnotificationtestspage-text-61-hhqi4x' className="text-xs text-muted-foreground">استخدم التأخير لتضع التطبيق في الخلفية أو تقفل الشاشة. لا تغلق التطبيق قبل أن ينتهي العد التنازلي.</p>
            </div>
            <Button id='features-super-admin-presentation-superadminnotificationtestspage-button-62-1aelkt' onClick={() => void runTest()} disabled={busy}>
              {busy ? <Loader2 id='features-super-admin-presentation-superadminnotificationtestspage-loader2-63-ldi3ry' className="me-2 h-4 w-4 animate-spin" /> : <Send id='features-super-admin-presentation-superadminnotificationtestspage-send-64-loxbey' className="me-2 h-4 w-4" />}
              {countdown !== null ? `الإرسال بعد ${countdown}` : mode === "local" ? "تشغيل الاختبار المحلي" : "إرسال Push إلى حسابي"}
            </Button>
          </div>
        </div>

        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-65-bwk2qb' className="rounded-xl border bg-card p-4">
          <h2 id='features-super-admin-presentation-superadminnotificationtestspage-heading-66-mwusiw' className="mb-4 font-semibold">المتوقع</h2>
          <dl id="features-super-admin-presentation-superadminnotificationtestspage-dl-67-mrathy" className="space-y-3 text-sm">
            <Detail id='features-super-admin-presentation-superadminnotificationtestspage-detail-68-ramksx' label="القناة" value={scenario.channelId} mono />
            <Detail id='features-super-admin-presentation-superadminnotificationtestspage-detail-69-gwy4yk' label="الأهمية" value={String(channel?.importance ?? "—")} />
            <Detail id='features-super-admin-presentation-superadminnotificationtestspage-detail-70-2zcdyx' label="الصوت" value={scenario.audible ? "custom_notification.mp3" : "بدون صوت"} />
            <Detail id='features-super-admin-presentation-superadminnotificationtestspage-detail-71-7ycfyn' label="الاهتزاز" value={channel?.vibration ? "مفعّل" : "متوقف"} />
            <Detail id='features-super-admin-presentation-superadminnotificationtestspage-detail-72-n8tk20' label="الفئة" value={scenario.category} />
            <Detail id='features-super-admin-presentation-superadminnotificationtestspage-detail-73-gb54mk' label="الأولوية" value={scenario.priority} />
          </dl>
          {remoteResult ? (
            <div id='features-super-admin-presentation-superadminnotificationtestspage-div-74-akkj4i' className="mt-5 rounded-lg border bg-muted/40 p-3 text-sm">
              <p id='features-super-admin-presentation-superadminnotificationtestspage-text-75-jspdii' className="flex items-center gap-2 font-semibold"><CheckCircle2 id='features-super-admin-presentation-superadminnotificationtestspage-checkcircle2-76-ose7h1' className="h-4 w-4 text-primary" />نتيجة Push</p>
              <p id='features-super-admin-presentation-superadminnotificationtestspage-text-77-pnvbb1' className="mt-2">الحالة: <strong id="features-super-admin-presentation-superadminnotificationtestspage-strong-78-v8vydl">{formatTestResultStatus(remoteResult.results[0]?.status ?? "failed")}</strong></p>
              <p id='features-super-admin-presentation-superadminnotificationtestspage-text-79-mchehc'>الرموز: <strong id="features-super-admin-presentation-superadminnotificationtestspage-strong-80-8fj6jp">{remoteResult.results[0]?.tokenCount ?? 0}</strong></p>
              <p id='features-super-admin-presentation-superadminnotificationtestspage-text-81-lh4sam' className="break-all" dir="ltr">{remoteResult.dedupeKey}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section id='features-super-admin-presentation-superadminnotificationtestspage-section-82-zpi7dy' className="rounded-xl border bg-card p-4">
        <div id='features-super-admin-presentation-superadminnotificationtestspage-div-83-snaibf' className="mb-4 flex items-center gap-2"><Clock3 id='features-super-admin-presentation-superadminnotificationtestspage-clock3-84-ammlpj' className="h-5 w-5 text-primary" /><h2 id='features-super-admin-presentation-superadminnotificationtestspage-heading-85-chwojc' className="font-semibold">آخر اختبارات هذه الجلسة</h2></div>
        {history.length === 0 ? <p id='features-super-admin-presentation-superadminnotificationtestspage-text-86-7ljzcm' className="text-sm text-muted-foreground">لم يُجرَ أي اختبار بعد.</p> : (
          <div id='features-super-admin-presentation-superadminnotificationtestspage-div-87-k1joql' className="overflow-x-auto">
            <table id='features-super-admin-presentation-superadminnotificationtestspage-table-88-twgyqz' className="w-full min-w-[680px] text-sm">
              <thead id='features-super-admin-presentation-superadminnotificationtestspage-thead-89-nr9uw9'><tr id='features-super-admin-presentation-superadminnotificationtestspage-tr-90-k3k73e' className="border-b text-muted-foreground"><th id='features-super-admin-presentation-superadminnotificationtestspage-th-91-0vzxya' className="p-2 text-start">الوقت</th><th id='features-super-admin-presentation-superadminnotificationtestspage-th-92-wzuzqq' className="p-2 text-start">النوع</th><th id='features-super-admin-presentation-superadminnotificationtestspage-th-93-lx7nu0' className="p-2 text-start">السيناريو</th><th id='features-super-admin-presentation-superadminnotificationtestspage-th-94-rl0gku' className="p-2 text-start">القناة</th><th id='features-super-admin-presentation-superadminnotificationtestspage-th-95-spd5sh' className="p-2 text-start">النتيجة</th><th id='features-super-admin-presentation-superadminnotificationtestspage-th-96-cvlyjo' className="p-2 text-start">المركز</th><th id='features-super-admin-presentation-superadminnotificationtestspage-th-97-8tlbvx' className="p-2 text-start">الرموز</th></tr></thead>
              <tbody id='features-super-admin-presentation-superadminnotificationtestspage-tbody-98-qk5fgr'>{history.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-2">{item.at}</td><td className="p-2">{item.mode === "local" ? "محلي" : "Push"}</td><td className="p-2">{getNotificationTestScenario(item.scenarioId)?.label}</td><td className="p-2 font-mono text-xs" dir="ltr">{item.channelId}</td><td className="p-2">{formatStoredTestResultStatus(item.status)}</td><td className="p-2">{item.centerStatus === "saved" ? "محفوظ" : item.centerStatus === "pending" ? "ينتظر المزامنة" : "مفقود"}</td><td className="p-2">{item.tokenCount}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusCard({ id, label, value, ok }: { label: string; value: string; ok: boolean } & { id?: string }) {
  return <div id={id} className="rounded-lg border p-3"><p id="features-super-admin-presentation-superadminnotificationtestspage-text-100-qp0flo" className="text-xs text-muted-foreground">{label}</p><p id="features-super-admin-presentation-superadminnotificationtestspage-text-101-meh43s" className={`mt-1 font-semibold ${ok ? "text-emerald-600" : "text-amber-600"}`}>{value}</p></div>;
}

function Detail({ id, label, value, mono = false }: { label: string; value: string; mono?: boolean } & { id?: string }) {
  return <div id={id} className="flex items-start justify-between gap-3 border-b pb-2"><dt id="features-super-admin-presentation-superadminnotificationtestspage-dt-103-hbf6jf" className="text-muted-foreground">{label}</dt><dd id="features-super-admin-presentation-superadminnotificationtestspage-dd-104-nnabpm" className={mono ? "font-mono text-xs" : "font-medium"} dir={mono ? "ltr" : undefined}>{value}</dd></div>;
}
