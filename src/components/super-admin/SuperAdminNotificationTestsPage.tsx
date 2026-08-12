"use client";

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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
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
import { DEFAULT_CHANNELS } from "@/native-platform";

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

const delayOptions = [0, 5, 10, 30] as const;
const batchSizeOptions = [1, 5] as const;

function createRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
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
      await notifications.importDelivered();
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
        at: new Date().toLocaleTimeString("ar-EG"),
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
            status: centerSaved ? `saved ${index}/${batchSize}` : `missing ${index}/${batchSize}`,
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
            status: `${lastStatus} ${index}/${batchSize}`,
            tokenCount: delivery?.tokenCount ?? 0,
            centerStatus: centerSaved ? "saved" : "pending",
          });
        }
        setMessage(
          acceptedCount === batchSize && centerCount === batchSize
            ? `تم قبول وحفظ ${batchSize} من ${batchSize} إشعارات Push متتالية.`
            : lastStatus === "no_tokens"
              ? "لا يوجد رمز Push مسجل لحساب السوبر أدمن. فعّل الجهاز أولًا."
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
        status: "failed",
        tokenCount: 0,
        centerStatus: "missing",
      });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !authorized) {
    return (
      <main className="container px-4 py-8 text-sm text-muted-foreground">
        جاري التحقق من الصلاحيات...
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <BellRing className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 className="text-2xl font-bold">اختبارات الإشعارات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اختبر القنوات والنغمة محليًا أو عبر المسار الحقيقي للخادم وFCM. اختبار Push مقيّد بحساب السوبر أدمن فقط.
          </p>
        </div>
      </header>

      {message ? (
        <div className="mb-5 rounded-lg border bg-card px-4 py-3 text-sm" role="status">
          {message}
        </div>
      ) : null}

      <section className="mb-5 rounded-xl border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">حالة الجهاز والتسجيل</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={statusBusy}>
            {statusBusy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <RefreshCw className="me-2 h-4 w-4" />}
            تحديث الحالة
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatusCard label="المنصة" value={status?.platform ?? "—"} ok={status?.platform === "android" || status?.platform === "ios"} />
          <StatusCard label="إذن الإشعارات" value={status?.permission ?? "—"} ok={status?.permission === "granted"} />
          <StatusCard label="Push مدعوم" value={status?.pushSupported ? "نعم" : "لا"} ok={Boolean(status?.pushSupported)} />
          <StatusCard label="الجهاز مفعّل" value={status?.deviceEnabled ? "نعم" : "لا"} ok={Boolean(status?.deviceEnabled)} />
          <StatusCard label="رموز الحساب" value={String(status?.recipient?.tokenCount ?? 0)} ok={Boolean(status?.recipient?.tokenCount)} />
          <StatusCard label="اختبارات محفوظة" value={String(status?.centerTestCount ?? 0)} ok={Boolean(status?.centerTestCount)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void enableNotifications()} disabled={statusBusy}>
            <ShieldCheck className="me-2 h-4 w-4" />
            تفعيل أو إعادة تسجيل الجهاز
          </Button>
          <Button variant="outline" onClick={() => void notifications.openPermissionSettings()}>
            <ExternalLink className="me-2 h-4 w-4" />
            فتح إعدادات التطبيق
          </Button>
          <Button variant="outline" onClick={() => void syncNotificationCenter()} disabled={statusBusy}>
            <RefreshCw className="me-2 h-4 w-4" />
            مزامنة الشريط مع صفحة الإشعارات
          </Button>
        </div>
        {status?.recipient ? (
          <p className="mt-3 text-xs text-muted-foreground">
            المنصات المسجلة: {status.recipient.platforms.join("، ") || "—"} · المزودون: {status.recipient.providers.join("، ") || "—"}. اختبار Push يصل إلى الأجهزة المسجلة لهذا الحساب فقط.
          </p>
        ) : null}
      </section>

      <section className="mb-5 rounded-xl border bg-card p-4">
        <h2 className="mb-4 font-semibold">اختر قناة الاختبار</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NOTIFICATION_TEST_SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScenarioId(item.id)}
              className={`rounded-xl border p-4 text-start transition-colors ${scenarioId === item.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
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

      <section className="mb-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">إعداد الاختبار</h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={mode === "local" ? "default" : "outline"} onClick={() => setMode("local")}>
                <Smartphone className="me-2 h-4 w-4" />اختبار محلي
              </Button>
              <Button type="button" variant={mode === "push" ? "default" : "outline"} onClick={() => setMode("push")}>
                <Wifi className="me-2 h-4 w-4" />Push حقيقي
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-test-title">العنوان</Label>
              <Input id="notification-test-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-test-body">النص</Label>
              <Textarea id="notification-test-body" value={body} maxLength={1000} rows={4} onChange={(event) => setBody(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-test-route">الرابط الداخلي</Label>
              <Input id="notification-test-route" value={routeHref} dir="ltr" onChange={(event) => setRouteHref(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-test-batch-size">عدد الإشعارات المتتالية</Label>
              <select id="notification-test-batch-size" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))}>
                {batchSizeOptions.map((count) => <option key={count} value={count}>{count === 1 ? "إشعار واحد" : `${count} إشعارات متتالية`}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-test-delay">التأخير</Label>
              <select id="notification-test-delay" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={delaySeconds} onChange={(event) => setDelaySeconds(Number(event.target.value))}>
                {delayOptions.map((seconds) => <option key={seconds} value={seconds}>{seconds === 0 ? "فوري" : `بعد ${seconds} ثوانٍ`}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">استخدم التأخير لتضع التطبيق في الخلفية أو تقفل الشاشة. لا تغلق التطبيق قبل أن ينتهي العد التنازلي.</p>
            </div>
            <Button onClick={() => void runTest()} disabled={busy}>
              {busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}
              {countdown !== null ? `الإرسال بعد ${countdown}` : mode === "local" ? "تشغيل الاختبار المحلي" : "إرسال Push إلى حسابي"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 font-semibold">المتوقع</h2>
          <dl className="space-y-3 text-sm">
            <Detail label="القناة" value={scenario.channelId} mono />
            <Detail label="الأهمية" value={String(channel?.importance ?? "—")} />
            <Detail label="الصوت" value={scenario.audible ? "custom_notification.mp3" : "بدون صوت"} />
            <Detail label="الاهتزاز" value={channel?.vibration ? "مفعّل" : "متوقف"} />
            <Detail label="الفئة" value={scenario.category} />
            <Detail label="الأولوية" value={scenario.priority} />
          </dl>
          {remoteResult ? (
            <div className="mt-5 rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />نتيجة Push</p>
              <p className="mt-2">الحالة: <strong>{remoteResult.results[0]?.status ?? "failed"}</strong></p>
              <p>الرموز: <strong>{remoteResult.results[0]?.tokenCount ?? 0}</strong></p>
              <p className="break-all" dir="ltr">{remoteResult.dedupeKey}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /><h2 className="font-semibold">آخر اختبارات هذه الجلسة</h2></div>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">لم يُجرَ أي اختبار بعد.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead><tr className="border-b text-muted-foreground"><th className="p-2 text-start">الوقت</th><th className="p-2 text-start">النوع</th><th className="p-2 text-start">السيناريو</th><th className="p-2 text-start">القناة</th><th className="p-2 text-start">النتيجة</th><th className="p-2 text-start">المركز</th><th className="p-2 text-start">الرموز</th></tr></thead>
              <tbody>{history.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-2">{item.at}</td><td className="p-2">{item.mode === "local" ? "محلي" : "Push"}</td><td className="p-2">{getNotificationTestScenario(item.scenarioId)?.label}</td><td className="p-2 font-mono text-xs" dir="ltr">{item.channelId}</td><td className="p-2">{item.status}</td><td className="p-2">{item.centerStatus === "saved" ? "محفوظ" : item.centerStatus === "pending" ? "ينتظر المزامنة" : "مفقود"}</td><td className="p-2">{item.tokenCount}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 font-semibold ${ok ? "text-emerald-600" : "text-amber-600"}`}>{value}</p></div>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-3 border-b pb-2"><dt className="text-muted-foreground">{label}</dt><dd className={mono ? "font-mono text-xs" : "font-medium"} dir={mono ? "ltr" : undefined}>{value}</dd></div>;
}
