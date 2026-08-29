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

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import {
  notifications,
  type BroadcastNotificationResult,
  type BroadcastRecipient,
  type BroadcastRecipientsResult,
} from "@/features/notifications";
import { uiAttributes } from "@asol/ui-registry-core";

export function SuperAdminNotificationBroadcastPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const [data, setData] = useState<BroadcastRecipientsResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [armedTarget, setArmedTarget] = useState<"selected" | "all" | null>(null);
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
      const next = await notifications.listPushRecipients(session);
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

  /**
   * Broadcasting is irreversible, so the button arms first and sends on the
   * second tap; a native browser dialog has no place in a touch-only app.
   */
  const send = async (sendToAll: boolean) => {
    if (!session || sendInFlightRef.current) return;
    const target = sendToAll ? "all" : "selected";
    if (armedTarget !== target) {
      setArmedTarget(target);
      return;
    }
    setArmedTarget(null);
    sendInFlightRef.current = true;
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const next = await notifications.sendPush({
        identity: session,
        requestId,
        title,
        body,
        sendToAll,
        uids: sendToAll ? undefined : [...selected],
      });
      setResult(next);
      const accepted = next.results.filter((item) =>
        ["sent", "queued", "partial"].includes(item.status),
      ).length;
      const unavailable = next.requested - accepted;
      setMessage(
        accepted > 0
          ? `تم قبول الإرسال إلى ${accepted} من ${next.requested} مستخدم. غير المتاح: ${unavailable}.`
          : `لم تقبل خدمة الإشعارات الإرسال إلى أي مستخدم من أصل ${next.requested}.`,
      );
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
      <main {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.main.3-7HG7I0", id: "super-admin.super-admin-notification-broadcast-page.main.3" })} id="super-admin.super-admin-notification-broadcast-page.main" className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق من الصلاحيات...
      </main>
    );
  }

  return (
    <main {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.main.4-7UQEZu", id: "super-admin.super-admin-notification-broadcast-page.main.4" })} id="super-admin.super-admin-notification-broadcast-page.main.2" className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.header.2-zueH2R", id: "super-admin.super-admin-notification-broadcast-page.header.2" })} id="super-admin.super-admin-notification-broadcast-page.header" className="mb-6 flex items-start gap-3">
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.13-W4ZRbV", id: "super-admin.super-admin-notification-broadcast-page.div.13" })} id="super-admin.super-admin-notification-broadcast-page.div" className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck id="super-admin.super-admin-notification-broadcast-page.shield-check" className="h-6 w-6" />
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.14-YjFeH5", id: "super-admin.super-admin-notification-broadcast-page.div.14" })} id="super-admin.super-admin-notification-broadcast-page.div.2">
          <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.11-bT1GC6", id: "super-admin.super-admin-notification-broadcast-page.p.11" })} id="super-admin.super-admin-notification-broadcast-page.p" className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.h1.2-XBe14W", id: "super-admin.super-admin-notification-broadcast-page.h1.2" })} id="super-admin.super-admin-notification-broadcast-page.h1" className="text-2xl font-bold">إرسال إشعار جماعي</h1>
          <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.12-y2Jq7w", id: "super-admin.super-admin-notification-broadcast-page.p.12" })} id="super-admin.super-admin-notification-broadcast-page.p.2" className="mt-1 text-sm text-muted-foreground">
            يتم عرض المستخدمين الذين لديهم رمز إشعارات مفعّل فقط، مع إخفاء قيمة
            الرمز الفعلية.
          </p>
        </div>
      </header>

      {message ? (
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.15-1NvuX6", id: "super-admin.super-admin-notification-broadcast-page.div.15" })} id="super-admin.super-admin-notification-broadcast-page.div.3"
          className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm"
          role="status"
        >
          {message}
        </div>
      ) : null}

      <section {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.section.5-8bs7K5", id: "super-admin.super-admin-notification-broadcast-page.section.5" })} id="super-admin.super-admin-notification-broadcast-page.section" className="mb-5 grid gap-3 md:grid-cols-4">
        <StatCard id="super-admin.super-admin-notification-broadcast-page.stat-card" title="المستخدمون" value={data?.userCount ?? 0} />
        <StatCard id="super-admin.super-admin-notification-broadcast-page.stat-card.2" title="رموز الأجهزة" value={data?.tokenCount ?? 0} />
        <StatCard id="super-admin.super-admin-notification-broadcast-page.stat-card.3" title="المحددون" value={selected.size} />
        <StatCard id="super-admin.super-admin-notification-broadcast-page.stat-card.4"
          title="مزودو الإرسال"
          value={Object.keys(data?.providerCounts ?? {}).length}
        />
      </section>

      <section {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.section.6-o0W4Y2", id: "super-admin.super-admin-notification-broadcast-page.section.6" })} id="super-admin.super-admin-notification-broadcast-page.section.2" className="mb-5 rounded-xl border bg-card p-4">
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.16-9J1Cva", id: "super-admin.super-admin-notification-broadcast-page.div.16" })} id="super-admin.super-admin-notification-broadcast-page.div.4" className="mb-4 flex items-center gap-2">
          <Megaphone id="super-admin.super-admin-notification-broadcast-page.megaphone" className="h-5 w-5 text-primary" />
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.h2.4-F5PGHX", id: "super-admin.super-admin-notification-broadcast-page.h2.4" })} id="super-admin.super-admin-notification-broadcast-page.h2" className="font-semibold">نص الرسالة</h2>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.17-hsJ3PP", id: "super-admin.super-admin-notification-broadcast-page.div.17" })} id="super-admin.super-admin-notification-broadcast-page.div.5" className="grid gap-4">
          <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.18-PE4UL7", id: "super-admin.super-admin-notification-broadcast-page.div.18" })} id="super-admin.super-admin-notification-broadcast-page.div.6" className="space-y-2">
            <Label ui={{ uid: "super-admin.super-admin-notification-broadcast-page.label.3-5dLVOb", id: "super-admin.super-admin-notification-broadcast-page.label.3" }} id="super-admin.super-admin-notification-broadcast-page.label" htmlFor="broadcast-title">العنوان</Label>
            <Input ui={{ uid: "super-admin.broadcast.title-4YC9TA", id: "super-admin.broadcast.title", kind: "field", part: "form" }}
              id="broadcast-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: تحديث جديد من ASOL"
            />
          </div>
          <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.19-RI6gOa", id: "super-admin.super-admin-notification-broadcast-page.div.19" })} id="super-admin.super-admin-notification-broadcast-page.div.7" className="space-y-2">
            <Label ui={{ uid: "super-admin.super-admin-notification-broadcast-page.label.4-VEGT0c", id: "super-admin.super-admin-notification-broadcast-page.label.4" }} id="super-admin.super-admin-notification-broadcast-page.label.2" htmlFor="broadcast-body">الرسالة</Label>
            <Textarea ui={{ uid: "super-admin.broadcast.body-4SVqRL", id: "super-admin.broadcast.body", kind: "field", part: "form" }}
              id="broadcast-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="اكتب نص الإشعار الذي سيصل للمستخدمين."
              rows={4}
            />
          </div>
          <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.20-g6U1pO", id: "super-admin.super-admin-notification-broadcast-page.div.20" })} id="super-admin.super-admin-notification-broadcast-page.div.8" className="flex flex-wrap gap-2">
            <Button id="super-admin.super-admin-notification-broadcast-page.button" ui={{ uid: "super-admin.broadcast.reload-recipients-9K63L4", id: "super-admin.broadcast.reload-recipients", kind: "action", action: "load-recipients", part: "actions" }}
              type="button"
              variant="outline"
              onClick={() => void load()}
              disabled={busy}
            >
              <RefreshCw id="super-admin.super-admin-notification-broadcast-page.refresh-cw" className="me-2 h-4 w-4" />
              تحديث المستلمين
            </Button>
            <Button id="super-admin.super-admin-notification-broadcast-page.button.2" ui={{ uid: "super-admin.broadcast.send-xTjVS2", id: "super-admin.broadcast.send", kind: "action", action: "send-broadcast", part: "actions" }}
              type="button"
              onClick={() => void send(false)}
              disabled={
                busy || selected.size === 0 || !title.trim() || !body.trim()
              }
            >
              {busy ? (
                <Loader2 id="super-admin.super-admin-notification-broadcast-page.loader2" className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Send id="super-admin.super-admin-notification-broadcast-page.send" className="me-2 h-4 w-4" />
              )}
              {armedTarget === "selected"
                ? `تأكيد الإرسال إلى ${selected.size} مستخدم`
                : "إرسال للمحدد"}
            </Button>
            <Button id="super-admin.super-admin-notification-broadcast-page.button.3" ui={{ uid: "super-admin.broadcast.send-test-33fBmH", id: "super-admin.broadcast.send-test", kind: "action", action: "send-test-broadcast", part: "actions" }}
              type="button"
              variant="secondary"
              onClick={() => void send(true)}
              disabled={
                busy || !data?.userCount || !title.trim() || !body.trim()
              }
            >
              {busy ? (
                <Loader2 id="super-admin.super-admin-notification-broadcast-page.loader2.2" className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <BellRing id="super-admin.super-admin-notification-broadcast-page.bell-ring" className="me-2 h-4 w-4" />
              )}
              {armedTarget === "all"
                ? `تأكيد الإرسال إلى ${data?.userCount ?? 0} مستخدم`
                : "إرسال للجميع"}
            </Button>
          </div>
        </div>
      </section>

      {result ? (
        <section {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.section.7-QRX5hu", id: "super-admin.super-admin-notification-broadcast-page.section.7" })} id="super-admin.super-admin-notification-broadcast-page.section.3" className="mb-5 rounded-xl border bg-card p-4">
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.h2.5-4oSo90", id: "super-admin.super-admin-notification-broadcast-page.h2.5" })} id="super-admin.super-admin-notification-broadcast-page.h2.2" className="mb-3 font-semibold">نتيجة الإرسال</h2>
          <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.21-4B4jgx", id: "super-admin.super-admin-notification-broadcast-page.div.21" })} id="super-admin.super-admin-notification-broadcast-page.div.9" className="grid gap-2 text-sm md:grid-cols-3">
            <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.13-AKFi59", id: "super-admin.super-admin-notification-broadcast-page.p.13" })} id="super-admin.super-admin-notification-broadcast-page.p.3">
              المطلوب: <strong {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.strong-CZWr9s", id: "super-admin.super-admin-notification-broadcast-page.strong" })}>{result.requested}</strong>
            </p>
            <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.14-K7W2tZ", id: "super-admin.super-admin-notification-broadcast-page.p.14" })} id="super-admin.super-admin-notification-broadcast-page.p.4">
              تم الإرسال:{""}
              <strong {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.strong.2-9O5sLB", id: "super-admin.super-admin-notification-broadcast-page.strong.2" })}>
                {result.results.filter((item) => item.status === "sent").length}
              </strong>
            </p>
            <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.15-5R7YZp", id: "super-admin.super-admin-notification-broadcast-page.p.15" })} id="super-admin.super-admin-notification-broadcast-page.p.5">
              إرسال جزئي:{""}
              <strong {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.strong.3-G6ugDy", id: "super-admin.super-admin-notification-broadcast-page.strong.3" })}>
                {
                  result.results.filter((item) => item.status === "partial")
                    .length
                }
              </strong>
            </p>
            <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.16-3UOpYI", id: "super-admin.super-admin-notification-broadcast-page.p.16" })} id="super-admin.super-admin-notification-broadcast-page.p.6">
              في الانتظار:{""}
              <strong {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.strong.4-zqR151", id: "super-admin.super-admin-notification-broadcast-page.strong.4" })}>
                {
                  result.results.filter((item) => item.status === "queued")
                    .length
                }
              </strong>
            </p>
            <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.17-pzVuj8", id: "super-admin.super-admin-notification-broadcast-page.p.17" })} id="super-admin.super-admin-notification-broadcast-page.p.7">
              فشل:{""}
              <strong {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.strong.5-fOEp6s", id: "super-admin.super-admin-notification-broadcast-page.strong.5" })}>
                {
                  result.results.filter((item) => item.status === "failed")
                    .length
                }
              </strong>
            </p>
            <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.18-qUjs20", id: "super-admin.super-admin-notification-broadcast-page.p.18" })} id="super-admin.super-admin-notification-broadcast-page.p.8">
              بدون رمز جهاز:{""}
              <strong {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.strong.6-OtA4NY", id: "super-admin.super-admin-notification-broadcast-page.strong.6" })}>
                {
                  result.results.filter((item) => item.status === "no_tokens")
                    .length
                }
              </strong>
            </p>
            <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.19-f2ldUr", id: "super-admin.super-admin-notification-broadcast-page.p.19" })} id="super-admin.super-admin-notification-broadcast-page.p.9">
              أوقف كل الإشعارات:{""}
              <strong {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.strong.7-9GDWQD", id: "super-admin.super-admin-notification-broadcast-page.strong.7" })}>
                {
                  result.results.filter((item) => item.status === "muted")
                    .length
                }
              </strong>
            </p>
          </div>
        </section>
      ) : null}

      <section {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.section.8-n2EEsW", id: "super-admin.super-admin-notification-broadcast-page.section.8" })} id="super-admin.super-admin-notification-broadcast-page.section.4" className="rounded-xl border bg-card">
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.22-5qGtDL", id: "super-admin.super-admin-notification-broadcast-page.div.22" })} id="super-admin.super-admin-notification-broadcast-page.div.10" className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.h2.6-6A8cIH", id: "super-admin.super-admin-notification-broadcast-page.h2.6" })} id="super-admin.super-admin-notification-broadcast-page.h2.3" className="font-semibold">المستلمون</h2>
          <Button id="super-admin.super-admin-notification-broadcast-page.button.4" ui={{ uid: "super-admin.broadcast.toggle-all-recipients-kz2RGW", id: "super-admin.broadcast.toggle-all-recipients", kind: "action", action: "toggle-all-recipients", part: "recipients" }}
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleAll}
            disabled={!data?.recipients.length}
          >
            {allSelected ? (
              <CheckSquare id="super-admin.super-admin-notification-broadcast-page.check-square" className="me-2 h-4 w-4" />
            ) : (
              <Square id="super-admin.super-admin-notification-broadcast-page.square" className="me-2 h-4 w-4" />
            )}
            {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </Button>
        </div>
        <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.23-CN5rsc", id: "super-admin.super-admin-notification-broadcast-page.div.23" })} id="super-admin.super-admin-notification-broadcast-page.div.11" className="max-h-[60vh] overflow-auto p-3">
          {data?.recipients.length ? (
            <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.24-0AHuhY", id: "super-admin.super-admin-notification-broadcast-page.div.24" })} id="super-admin.super-admin-notification-broadcast-page.div.12" className="space-y-2">
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
            <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.20-vI9nF9", id: "super-admin.super-admin-notification-broadcast-page.p.20" })} id="super-admin.super-admin-notification-broadcast-page.p.10" className="py-12 text-center text-sm text-muted-foreground">
              لا يوجد مستخدمون لديهم رمز إشعارات مفعّل.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({ id, title, value }: { title: string; value: number } & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.25-3usRwZ", id: "super-admin.super-admin-notification-broadcast-page.div.25" })} id={id} className="rounded-xl border bg-card p-4">
      <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.21-2uGmyz", id: "super-admin.super-admin-notification-broadcast-page.p.21" })} className="text-xs text-muted-foreground">{title}</p>
      <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.22-Aqz94z", id: "super-admin.super-admin-notification-broadcast-page.p.22" })} className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function RecipientRow({ id,
  recipient,
  checked,
  onToggle,
}: {
  recipient: BroadcastRecipient;
  checked: boolean;
  onToggle: () => void;
} & { id?: string }) {
  return (
    <button {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.button.5-N1eA2Q", id: "super-admin.super-admin-notification-broadcast-page.button.5" })} id={id}
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-start transition"
    >
      {checked ? (
        <CheckSquare className="mt-1 h-5 w-5 shrink-0 text-primary" />
      ) : (
        <Square className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <div {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.div.26-52VWex", id: "super-admin.super-admin-notification-broadcast-page.div.26" })} className="min-w-0 flex-1">
        <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.23-o6rGtg", id: "super-admin.super-admin-notification-broadcast-page.p.23" })} className="font-semibold" dir="ltr">
          {recipient.uid}
        </p>
        <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.24-Pfc7MV", id: "super-admin.super-admin-notification-broadcast-page.p.24" })} className="mt-1 text-xs text-muted-foreground">
          {recipient.phoneMasked}
          {recipient.emailMasked ? ` - ${recipient.emailMasked}` : ""}
        </p>
        <p {...uiAttributes({ uid: "super-admin.super-admin-notification-broadcast-page.p.25-4ydE4U", id: "super-admin.super-admin-notification-broadcast-page.p.25" })} className="mt-1 text-xs text-muted-foreground">
          رموز الأجهزة: {recipient.tokenCount} | المنصات:{""}
          {recipient.platforms.join(",")} | المزودون:{""}
          {recipient.providers.join(",")}
        </p>
      </div>
    </button>
  );
}
