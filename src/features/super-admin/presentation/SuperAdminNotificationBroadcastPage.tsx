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
      <main id='features-super-admin-presentation-superadminnotificationbroadcastpage-main-1-7pwpdt' className="container px-4 py-8 text-sm text-on-surface-variant">
        جاري التحقق من الصلاحيات...
      </main>
    );
  }

  return (
    <main id='features-super-admin-presentation-superadminnotificationbroadcastpage-main-2-lunkgd' className="container mx-auto max-w-7xl px-4 py-8" dir="rtl">
      <header id='features-super-admin-presentation-superadminnotificationbroadcastpage-header-3-sokh3l' className="mb-6 flex items-start gap-3">
        <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-4-k3pafz' className="rounded-xl bg-primary/10 p-3 text-primary">
          <ShieldCheck id='features-super-admin-presentation-superadminnotificationbroadcastpage-shieldcheck-5-0ixosg' className="h-6 w-6" />
        </div>
        <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-6-y3p30v'>
          <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-7-h2g8zm' className="text-sm font-medium text-primary">منطقة السوبر أدمن</p>
          <h1 id='features-super-admin-presentation-superadminnotificationbroadcastpage-heading-8-tqcwwv' className="text-2xl font-bold">إرسال إشعار جماعي</h1>
          <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-9-evr49i' className="mt-1 text-sm text-muted-foreground">
            يتم عرض المستخدمين الذين لديهم رمز إشعارات مفعّل فقط، مع إخفاء قيمة
            الرمز الفعلية.
          </p>
        </div>
      </header>

      {message ? (
        <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-10-1tnvms'
          className="mb-4 rounded-lg border bg-card px-4 py-3 text-sm"
          role="status"
        >
          {message}
        </div>
      ) : null}

      <section id='features-super-admin-presentation-superadminnotificationbroadcastpage-section-11-1vcrqo' className="mb-5 grid gap-3 md:grid-cols-4">
        <StatCard id='features-super-admin-presentation-superadminnotificationbroadcastpage-statcard-12-lpbjwh' title="المستخدمون" value={data?.userCount ?? 0} />
        <StatCard id='features-super-admin-presentation-superadminnotificationbroadcastpage-statcard-13-auuskc' title="رموز الأجهزة" value={data?.tokenCount ?? 0} />
        <StatCard id='features-super-admin-presentation-superadminnotificationbroadcastpage-statcard-14-gyf2wt' title="المحددون" value={selected.size} />
        <StatCard id='features-super-admin-presentation-superadminnotificationbroadcastpage-statcard-15-xizvsd'
          title="مزودو الإرسال"
          value={Object.keys(data?.providerCounts ?? {}).length}
        />
      </section>

      <section id='features-super-admin-presentation-superadminnotificationbroadcastpage-section-16-c7vwj9' className="mb-5 rounded-xl border bg-card p-4">
        <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-17-ggg4bu' className="mb-4 flex items-center gap-2">
          <Megaphone id='features-super-admin-presentation-superadminnotificationbroadcastpage-megaphone-18-39jrhp' className="h-5 w-5 text-primary" />
          <h2 id='features-super-admin-presentation-superadminnotificationbroadcastpage-heading-19-rxwzra' className="font-semibold">نص الرسالة</h2>
        </div>
        <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-20-o8klc5' className="grid gap-4">
          <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-21-eqdchx' className="space-y-2">
            <Label id='features-super-admin-presentation-superadminnotificationbroadcastpage-label-22-ynu4ld' htmlFor='features-super-admin-presentation-superadminnotificationbroadcastpage-input-23-7dnaes'>العنوان</Label>
            <Input
              id='features-super-admin-presentation-superadminnotificationbroadcastpage-input-23-7dnaes'
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: تحديث جديد من ASOL"
            />
          </div>
          <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-24-ygx7qn' className="space-y-2">
            <Label id='features-super-admin-presentation-superadminnotificationbroadcastpage-label-25-8hovon' htmlFor='features-super-admin-presentation-superadminnotificationbroadcastpage-textarea-26-krf0q5'>الرسالة</Label>
            <Textarea
              id='features-super-admin-presentation-superadminnotificationbroadcastpage-textarea-26-krf0q5'
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="اكتب نص الإشعار الذي سيصل للمستخدمين."
              rows={4}
            />
          </div>
          <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-27-2irilq' className="flex flex-wrap gap-2">
            <Button id='features-super-admin-presentation-superadminnotificationbroadcastpage-button-28-tyobsw'
              type="button"
              variant="outline"
              onClick={() => void load()}
              disabled={busy}
            >
              <RefreshCw id='features-super-admin-presentation-superadminnotificationbroadcastpage-refreshcw-29-1zjd8i' className="me-2 h-4 w-4" />
              تحديث المستلمين
            </Button>
            <Button id='features-super-admin-presentation-superadminnotificationbroadcastpage-button-30-hduzai'
              type="button"
              onClick={() => void send(false)}
              disabled={
                busy || selected.size === 0 || !title.trim() || !body.trim()
              }
            >
              {busy ? (
                <Loader2 id='features-super-admin-presentation-superadminnotificationbroadcastpage-loader2-31-cmflkr' className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Send id='features-super-admin-presentation-superadminnotificationbroadcastpage-send-32-cx0brt' className="me-2 h-4 w-4" />
              )}
              {armedTarget === "selected"
                ? `تأكيد الإرسال إلى ${selected.size} مستخدم`
                : "إرسال للمحدد"}
            </Button>
            <Button id='features-super-admin-presentation-superadminnotificationbroadcastpage-button-33-yvrqbu'
              type="button"
              variant="secondary"
              onClick={() => void send(true)}
              disabled={
                busy || !data?.userCount || !title.trim() || !body.trim()
              }
            >
              {busy ? (
                <Loader2 id='features-super-admin-presentation-superadminnotificationbroadcastpage-loader2-34-ftr2ho' className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <BellRing id='features-super-admin-presentation-superadminnotificationbroadcastpage-bellring-35-1nnibi' className="me-2 h-4 w-4" />
              )}
              {armedTarget === "all"
                ? `تأكيد الإرسال إلى ${data?.userCount ?? 0} مستخدم`
                : "إرسال للجميع"}
            </Button>
          </div>
        </div>
      </section>

      {result ? (
        <section id='features-super-admin-presentation-superadminnotificationbroadcastpage-section-36-gqy54f' className="mb-5 rounded-xl border bg-card p-4">
          <h2 id='features-super-admin-presentation-superadminnotificationbroadcastpage-heading-37-3ldrss' className="mb-3 font-semibold">نتيجة الإرسال</h2>
          <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-38-zwkz4d' className="grid gap-2 text-sm md:grid-cols-3">
            <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-39-ehbz7j'>
              المطلوب: <strong id="features-super-admin-presentation-superadminnotificationbroadcastpage-strong-40-uagr0y">{result.requested}</strong>
            </p>
            <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-41-kak8j8'>
              تم الإرسال:{""}
              <strong id="features-super-admin-presentation-superadminnotificationbroadcastpage-strong-42-s1rntv">
                {result.results.filter((item) => item.status === "sent").length}
              </strong>
            </p>
            <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-43-e759ai'>
              إرسال جزئي:{""}
              <strong id="features-super-admin-presentation-superadminnotificationbroadcastpage-strong-44-4aeh85">
                {
                  result.results.filter((item) => item.status === "partial")
                    .length
                }
              </strong>
            </p>
            <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-45-2sz9e7'>
              في الانتظار:{""}
              <strong id="features-super-admin-presentation-superadminnotificationbroadcastpage-strong-46-vvatqh">
                {
                  result.results.filter((item) => item.status === "queued")
                    .length
                }
              </strong>
            </p>
            <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-47-u4vgmp'>
              فشل:{""}
              <strong id="features-super-admin-presentation-superadminnotificationbroadcastpage-strong-48-jknoql">
                {
                  result.results.filter((item) => item.status === "failed")
                    .length
                }
              </strong>
            </p>
            <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-49-n39bgn'>
              بدون رمز جهاز:{""}
              <strong id="features-super-admin-presentation-superadminnotificationbroadcastpage-strong-50-mxdxq7">
                {
                  result.results.filter((item) => item.status === "no_tokens")
                    .length
                }
              </strong>
            </p>
            <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-51-4oltpe'>
              أوقف كل الإشعارات:{""}
              <strong id="features-super-admin-presentation-superadminnotificationbroadcastpage-strong-52-dqykzk">
                {
                  result.results.filter((item) => item.status === "muted")
                    .length
                }
              </strong>
            </p>
          </div>
        </section>
      ) : null}

      <section id='features-super-admin-presentation-superadminnotificationbroadcastpage-section-53-cuc2rp' className="rounded-xl border bg-card">
        <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-54-qlzlf6' className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 id='features-super-admin-presentation-superadminnotificationbroadcastpage-heading-55-cxvxya' className="font-semibold">المستلمون</h2>
          <Button id='features-super-admin-presentation-superadminnotificationbroadcastpage-button-56-glkslg'
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleAll}
            disabled={!data?.recipients.length}
          >
            {allSelected ? (
              <CheckSquare id='features-super-admin-presentation-superadminnotificationbroadcastpage-checksquare-57-dgzare' className="me-2 h-4 w-4" />
            ) : (
              <Square id='features-super-admin-presentation-superadminnotificationbroadcastpage-square-58-0mu2qq' className="me-2 h-4 w-4" />
            )}
            {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </Button>
        </div>
        <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-59-2nenpm' className="max-h-[60vh] overflow-auto p-3">
          {data?.recipients.length ? (
            <div id='features-super-admin-presentation-superadminnotificationbroadcastpage-div-60-y2faz5' className="space-y-2">
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
            <p id='features-super-admin-presentation-superadminnotificationbroadcastpage-text-61-sfrzze' className="py-12 text-center text-sm text-muted-foreground">
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
    <div id={id} className="rounded-xl border bg-card p-4">
      <p id="features-super-admin-presentation-superadminnotificationbroadcastpage-text-63-d3ihug" className="text-xs text-muted-foreground">{title}</p>
      <p id="features-super-admin-presentation-superadminnotificationbroadcastpage-text-64-stofmm" className="mt-1 text-2xl font-bold">{value}</p>
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
    <button id={id}
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-start transition"
    >
      {checked ? (
        <CheckSquare className="mt-1 h-5 w-5 shrink-0 text-primary" />
      ) : (
        <Square className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      )}
      <div id="features-super-admin-presentation-superadminnotificationbroadcastpage-div-66-wvi5yt" className="min-w-0 flex-1">
        <p id="features-super-admin-presentation-superadminnotificationbroadcastpage-text-67-4gkdjr" className="font-semibold" dir="ltr">
          {recipient.uid}
        </p>
        <p id="features-super-admin-presentation-superadminnotificationbroadcastpage-text-68-f1swbj" className="mt-1 text-xs text-muted-foreground">
          {recipient.phoneMasked}
          {recipient.emailMasked ? ` - ${recipient.emailMasked}` : ""}
        </p>
        <p id="features-super-admin-presentation-superadminnotificationbroadcastpage-text-69-ifltcy" className="mt-1 text-xs text-muted-foreground">
          رموز الأجهزة: {recipient.tokenCount} | المنصات:{""}
          {recipient.platforms.join(",")} | المزودون:{""}
          {recipient.providers.join(",")}
        </p>
      </div>
    </button>
  );
}
