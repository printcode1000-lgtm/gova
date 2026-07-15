"use client";

import { BellRing, KeyRound, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import type { NotificationVapidAdminConfig } from "@/features/notifications/domain/entities";
import { notificationApiService } from "@/features/notifications/services/notification-api-service";

export function SuperAdminVapidPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const [config, setConfig] = useState<NotificationVapidAdminConfig | null>(null);
  const [subject, setSubject] = useState("mailto:admin@asol.local");
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await notificationApiService.getVapidAdmin(session);
      setConfig(next);
      setSubject(next.subject);
      setEnabled(next.enabled);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل إعدادات VAPID.");
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
    if (!isLoading && authorized) void load();
  }, [authorized, isLoading, load, router, session]);

  const generate = async () => {
    if (!session) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await notificationApiService.generateVapid({ identity: session, subject });
      setConfig(next);
      setSubject(next.subject);
      setEnabled(next.enabled);
      setMessage("تم إنشاء مفاتيح VAPID جديدة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إنشاء مفاتيح VAPID.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!session) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await notificationApiService.saveVapid({ identity: session, subject, enabled });
      setConfig(next);
      setMessage("تم حفظ إعدادات VAPID.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ إعدادات VAPID.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !authorized) {
    return <main className="container px-4 py-8 text-sm text-on-surface-variant">جاري التحقق من الصلاحيات...</main>;
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8" dir="rtl">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-6 w-6" /></div>
        <div>
          <p className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 className="text-2xl font-bold">إدارة VAPID لإشعارات المتصفح</h1>
          <p className="mt-1 text-sm text-muted-foreground">المفتاح الخاص لا يظهر في الواجهة ولا يستخدم إلا من السيرفر.</p>
        </div>
      </header>

      {message ? <div className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm" role="status">{message}</div> : null}

      <section className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="vapid-subject">Subject</Label>
          <Input id="vapid-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="mailto:admin@asol.local" dir="ltr" />
        </div>
        <div className="rounded-xl border bg-background p-4">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-primary" />
            <div><p className="font-semibold">Web Push</p><p className="text-xs text-muted-foreground">{enabled ? "مفعل" : "متوقف"}</p></div>
            <Switch className="ms-auto" checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <div><p className="font-semibold">المفتاح الخاص</p><p className="text-xs text-muted-foreground">{config?.hasPrivateKey ? "موجود ومحمي في السيرفر" : "غير موجود"}</p></div>
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>المفتاح العام</Label>
          <div className="rounded-lg border bg-background p-3 font-mono text-xs" dir="ltr">{config?.publicKey || "لم يتم إنشاء مفتاح عام بعد."}</div>
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="button" onClick={() => void load()} disabled={busy} variant="outline"><RefreshCw className="me-2 h-4 w-4" />تحديث</Button>
          <Button type="button" onClick={() => void save()} disabled={busy || !config}>{busy ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Save className="me-2 h-4 w-4" />}حفظ</Button>
          <Button type="button" onClick={() => void generate()} disabled={busy} variant="secondary"><KeyRound className="me-2 h-4 w-4" />إنشاء مفاتيح جديدة</Button>
        </div>
      </section>
    </main>
  );
}
