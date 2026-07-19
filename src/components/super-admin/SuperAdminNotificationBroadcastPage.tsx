"use client";

import {
  BellRing,
  CheckSquare,
  Loader2,
  Megaphone,
  RefreshCw,
  Send,
  ShieldCheck,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import type {
  BroadcastNotificationResult,
  BroadcastRecipient,
  BroadcastRecipientsResult,
} from "@/features/notifications/domain/entities";
import { notificationApiService } from "@/features/notifications/services/notification-api-service";

export function SuperAdminNotificationBroadcastPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const [data, setData] = useState<BroadcastRecipientsResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<BroadcastNotificationResult | null>(
    null,
  );
  const sendInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!session || !isSuperAdmin(session)) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await notificationApiService.getBroadcastRecipients(session);
      setData(next);
      setSelected(new Set(next.recipients.map((recipient) => recipient.uid)));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "تعذر تحميل المستخدمين المستلمين.",
      );
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
    if (!isLoading && authorized) void load();
  }, [authorized, isLoading, load, router, session]);

  const allSelected = useMemo(
    () =>
      data
        ? selected.size === data.recipients.length && data.recipients.length > 0
        : false,
    [data, selected.size],
  );

  const toggleAll = () => {
    if (!data) return;
    setSelected(
      allSelected
        ? new Set()
        : new Set(data.recipients.map((recipient) => recipient.uid)),
    );
  };

  const toggleOne = (uid: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const send = async (sendToAll: boolean) => {
    if (!session || sendInFlightRef.current) return;
    const count = sendToAll ? (data?.userCount ?? 0) : selected.size;
    const confirmed = window.confirm(
      `سيتم إرسال الإشعار إلى ${count} مستخدم. هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    sendInFlightRef.current = true;
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const next = await notificationApiService.sendBroadcast({
        identity: session,
        requestId,
        title,
        body,
        sendToAll,
        uids: sendToAll ? undefined : [...selected],
      });
      setResult(next);
      setMessage("تم تنفيذ الإرسال.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر إرسال الإشعار الجماعي.",
      );
    } finally {
      sendInFlightRef.current = false;
      setBusy(false);
    }
  };

  if (isLoading || !authorized) {
    return (
      <main className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق من الصلاحيات...
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 className="text-2xl font-bold">إرسال إشعار جماعي</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            يتم عرض المستخدمين الذين لديهم رمز إشعارات مفعّل فقط، مع إخفاء قيمة
            الرمز الفعلية.
          </p>
        </div>
      </header>

      {message ? (
        <div
          className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm"
          role="status"
        >
          {message}
        </div>
      ) : null}

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        <StatCard title="المستخدمون" value={data?.userCount ?? 0} />
        <StatCard title="رموز الأجهزة" value={data?.tokenCount ?? 0} />
        <StatCard title="المحددون" value={selected.size} />
        <StatCard
          title="مزودو الإرسال"
          value={Object.keys(data?.providerCounts ?? {}).length}
        />
      </section>

      <section className="mb-5 rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">نص الرسالة</h2>
        </div>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="broadcast-title">العنوان</Label>
            <Input
              id="broadcast-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: تحديث جديد من ASOL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast-body">الرسالة</Label>
            <Textarea
              id="broadcast-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="اكتب نص الإشعار الذي سيصل للمستخدمين."
              rows={4}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              disabled={busy}
            >
              <RefreshCw className="me-2 h-4 w-4" />
              تحديث المستلمين
            </Button>
            <Button
              type="button"
              onClick={() => void send(false)}
              disabled={
                busy || selected.size === 0 || !title.trim() || !body.trim()
              }
            >
              {busy ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="me-2 h-4 w-4" />
              )}
              إرسال للمحدد
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void send(true)}
              disabled={
                busy || !data?.userCount || !title.trim() || !body.trim()
              }
            >
              {busy ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="me-2 h-4 w-4" />
              )}
              إرسال للجميع
            </Button>
          </div>
        </div>
      </section>

      {result ? (
        <section className="mb-5 rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">نتيجة الإرسال</h2>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p>
              المطلوب: <strong>{result.requested}</strong>
            </p>
            <p>
              تم الإرسال:{" "}
              <strong>
                {result.results.filter((item) => item.status === "sent").length}
              </strong>
            </p>
            <p>
              إرسال جزئي:{" "}
              <strong>
                {
                  result.results.filter((item) => item.status === "partial")
                    .length
                }
              </strong>
            </p>
            <p>
              فشل:{" "}
              <strong>
                {
                  result.results.filter((item) => item.status === "failed")
                    .length
                }
              </strong>
            </p>
            <p>
              بدون رمز جهاز:{" "}
              <strong>
                {
                  result.results.filter((item) => item.status === "no_tokens")
                    .length
                }
              </strong>
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 className="font-semibold">المستلمون</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleAll}
            disabled={!data?.recipients.length}
          >
            {allSelected ? (
              <CheckSquare className="me-2 h-4 w-4" />
            ) : (
              <Square className="me-2 h-4 w-4" />
            )}
            {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-3">
          {data?.recipients.length ? (
            <div className="space-y-2">
              {data.recipients.map((recipient) => (
                <RecipientRow
                  key={recipient.uid}
                  recipient={recipient}
                  checked={selected.has(recipient.uid)}
                  onToggle={() => toggleOne(recipient.uid)}
                />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              لا يوجد مستخدمون لديهم رمز إشعارات مفعّل.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function RecipientRow({
  recipient,
  checked,
  onToggle,
}: {
  recipient: BroadcastRecipient;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-start transition hover:border-primary/40"
    >
      {checked ? (
        <CheckSquare className="mt-1 h-5 w-5 shrink-0 text-primary" />
      ) : (
        <Square className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold" dir="ltr">
          {recipient.uid}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {recipient.phoneMasked}
          {recipient.emailMasked ? ` - ${recipient.emailMasked}` : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          رموز الأجهزة: {recipient.tokenCount} | المنصات:{" "}
          {recipient.platforms.join(", ")} | المزودون:{" "}
          {recipient.providers.join(", ")}
        </p>
      </div>
    </button>
  );
}
