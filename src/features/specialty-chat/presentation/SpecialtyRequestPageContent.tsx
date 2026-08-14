"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, Send, Users } from "lucide-react";
import { categoryService } from "@/features/categories";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useTranslation } from "@/lib/i18n";
import { specialtyChatClient } from "../application/specialty-chat-client";
import { getSpecialtyChatSubOptions } from "../domain/specialty-options";

function makeId(prefix: string) {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${value.replace(/-/g, "")}`;
}

type ResultState = { kind: "success" | "empty" | "error"; message: string } | null;

export function SpecialtyRequestPageContent() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const { locale, isRTL } = useTranslation();
  const [mainId, setMainId] = React.useState("");
  const [subId, setSubId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ResultState>(null);
  const redirectTimerRef = React.useRef<number | null>(null);
  const mains = React.useMemo(() => categoryService.getProfileMainOptions(), []);
  const main = mainId
    ? mains.find((item) => item.id === Number(mainId))
    : undefined;
  const subs = main ? getSpecialtyChatSubOptions(main) : [];
  const sub = subId
    ? subs.find((item) => item.originalId === Number(subId))
    : undefined;

  React.useEffect(() => () => {
    if (redirectTimerRef.current !== null) window.clearTimeout(redirectTimerRef.current);
  }, []);

  const copy = locale === "ar" ? {
    title: "طلب من مقدمي الخدمات",
    subtitle: "اختر تخصصًا واحدًا. سيصل طلبك فقط إلى مقدمي الخدمة المتاحين، وسيكون كل رد خاصًا بك.",
    main: "التخصص الرئيسي", sub: "التخصص الفرعي", message: "نص الطلب",
    placeholder: "اكتب ما تحتاجه بوضوح...", submit: "إرسال الطلب",
    login: "يجب تسجيل الدخول لإرسال الطلب واستقبال الردود.", signIn: "تسجيل الدخول",
    empty: "لا يوجد مقدمو خدمة متاحون لهذا التخصص حاليًا. لم يتم احتساب الطلب كإرسال ناجح.",
    failure: "تعذر إرسال الطلب. حاول مرة أخرى.",
    success: (sent: number, unavailable: number) =>
      `تم إرسال الطلب بنجاح إلى ${sent} ${sent === 1 ? "مقدم خدمة" : "من مقدمي الخدمة"}${unavailable > 0 ? `، وتعذر الوصول إلى ${unavailable}` : ""}. سيتم نقلك إلى محادثات الإشعارات خلال 3 ثوانٍ لمتابعة الردود.`,
  } : {
    title: "Request from service providers",
    subtitle: "Choose one specialty. Only available providers receive it, and every reply stays private.",
    main: "Main specialty", sub: "Sub-specialty", message: "Request details",
    placeholder: "Clearly describe what you need...", submit: "Send request",
    login: "Sign in to send a request and receive replies.", signIn: "Sign in",
    empty: "No providers are currently reachable for this specialty. The request was not counted as sent.",
    failure: "Unable to send the request. Try again.",
    success: (sent: number, unavailable: number) =>
      `Request sent successfully to ${sent} service provider${sent === 1 ? "" : "s"}${unavailable > 0 ? `; ${unavailable} could not be reached` : ""}. You will be taken to notification chats in 3 seconds to follow replies.`,
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.sessionToken || !main || !sub || !message.trim() || busy) return;
    setBusy(true);
    setResult(null);
    const requestId = makeId("req");
    try {
      const sent = await specialtyChatClient.sendRequest(session, {
        requestId,
        mainCategoryId: main.id,
        subcategoryId: sub.originalId!,
        mainCategoryName: locale === "ar" ? main.nameAr : main.nameEn,
        subcategoryName: locale === "ar" ? sub.nameAr : sub.nameEn,
        message: message.trim(),
      });
      const delivered = sent.deliveredUsers ?? 0;
      if (delivered < 1) {
        setResult({ kind: "empty", message: copy.empty });
        return;
      }
      setMessage("");
      setResult({ kind: "success", message: copy.success(delivered, sent.unavailableUsers) });
      redirectTimerRef.current = window.setTimeout(() => {
        router.replace(`/notifications?filter=chat&focus=${encodeURIComponent(requestId)}`);
      }, 3_000);
    } catch (error) {
      const unavailable = error instanceof Error && error.message === "specialtyChatRecipientUnavailable";
      setResult({
        kind: unavailable ? "empty" : "error",
        message: unavailable ? copy.empty : copy.failure,
      });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></main>;
  if (!session?.sessionToken) return (
    <main className="mx-auto max-w-xl px-4 py-14 text-center">
      <Users className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 text-2xl font-bold">{copy.title}</h1>
      <p className="mt-2 text-on-surface-variant">{copy.login}</p>
      <Link href="/login" className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-on-primary">{copy.signIn}</Link>
    </main>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mb-5 flex items-start gap-3">
        <button type="button" onClick={() => router.back()} className="asol-control-icon mt-1 shrink-0 rounded-full" aria-label={locale === "ar" ? "رجوع" : "Back"}>
          <ArrowLeft className={isRTL ? "h-5 w-5 rotate-180" : "h-5 w-5"} />
        </button>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-primary"><Users className="h-6 w-6" /></span>
        <div><h1 className="text-2xl font-bold">{copy.title}</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">{copy.subtitle}</p></div>
      </div>

      <form onSubmit={submit} className="space-y-6 rounded-3xl border border-outline-variant bg-surface p-4 shadow-sm sm:p-6">
        <fieldset disabled={busy || result?.kind === "success"} className="min-w-0 space-y-6 disabled:opacity-70">
          <div className="min-w-0">
            <p className="mb-3 font-bold">{copy.main}</p>
            <div className="flex w-full max-w-full gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {mains.map((item) => {
                const selected = mainId === String(item.id);
                return <button key={item.id} type="button" aria-pressed={selected} onClick={() => { setMainId(String(item.id)); setSubId(""); setResult(null); }} className={`inline-flex shrink-0 items-center gap-3 rounded-2xl border py-2 pe-4 ps-2 text-sm font-bold transition ${selected ? "border-primary bg-primary text-on-primary shadow-md" : "border-outline-variant bg-surface-container text-on-surface"}`}>
                  {item.imageUrl ? <Image src={item.imageUrl} alt="" width={56} height={56} className="h-12 w-12 rounded-xl object-cover sm:h-14 sm:w-14" /> : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-current/10 sm:h-14 sm:w-14"><Users className="h-5 w-5" /></span>}
                  {locale === "ar" ? item.nameAr : item.nameEn}
                </button>;
              })}
            </div>
          </div>

          {main ? <div className="min-w-0">
            <p className="mb-3 font-bold">{copy.sub}</p>
            <div className="flex w-full max-w-full gap-3 overflow-x-auto rounded-2xl bg-surface-container-low p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {subs.map((item) => {
                const value = String(item.originalId); const selected = subId === value;
                return <button key={value} type="button" aria-pressed={selected} onClick={() => { setSubId(value); setResult(null); }} className={`inline-flex shrink-0 items-center gap-3 rounded-2xl border py-2 pe-4 ps-2 text-sm font-bold transition ${selected ? "border-secondary bg-secondary text-secondary-foreground shadow-md" : "border-outline-variant bg-surface text-on-surface"}`}>
                  {item.imageUrl ? <Image src={item.imageUrl} alt="" width={48} height={48} className="h-11 w-11 rounded-xl object-cover sm:h-12 sm:w-12" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-current/10 sm:h-12 sm:w-12"><Users className="h-5 w-5" /></span>}
                  {locale === "ar" ? item.nameAr : item.nameEn}
                </button>;
              })}
            </div>
          </div> : null}

          <label className="grid gap-2 font-bold">{copy.message}
            <textarea value={message} onChange={(event) => { setMessage(event.target.value.slice(0, 800)); setResult(null); }} maxLength={800} rows={6} className="min-h-40 w-full min-w-0 max-w-full resize-y rounded-2xl border border-outline-variant bg-surface px-4 py-3 font-normal" placeholder={copy.placeholder} required />
            <span className="text-end text-xs font-normal text-on-surface-variant">{message.length}/800</span>
          </label>
        </fieldset>

        {result ? <p className={`rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${result.kind === "success" ? "bg-success/15 text-on-surface" : result.kind === "empty" ? "bg-warning/15 text-on-surface" : "bg-error/15 text-error"}`} role={result.kind === "error" ? "alert" : "status"}>
          {result.kind === "success" ? <MessageCircle className="me-2 inline h-5 w-5" /> : null}{result.message}
        </p> : null}

        <button type="submit" disabled={busy || !main || !sub || !message.trim() || result?.kind === "success"} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-lg font-bold text-on-primary disabled:opacity-50">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}{copy.submit}
        </button>
      </form>
    </main>
  );
}
