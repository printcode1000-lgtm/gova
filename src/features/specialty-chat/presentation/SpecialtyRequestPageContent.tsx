"use client";

import * as React from "react";
import { CATEGORY_TABS_PAIR_CLASS, CategoryTabsStrip } from "@/shared/ui/category-tabs-strip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Send, Users } from "lucide-react";
import { categoryService } from "@/features/categories";
import { useSession } from "@/features/auth/ui";
import { useTranslation } from "@/shared/i18n";
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
    title: "ارسال طلب الي مقدمي الخدمات",
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

  if (isLoading) return <main id='features-specialty-chat-presentation-specialtyrequestpagecontent-main-1-8w7did' className="flex min-h-[60vh] items-center justify-center"><Loader2 id='features-specialty-chat-presentation-specialtyrequestpagecontent-loader2-2-udmrti' className="h-7 w-7 animate-spin text-primary" /></main>;
  if (!session?.sessionToken) return (
    <main id='features-specialty-chat-presentation-specialtyrequestpagecontent-main-3-wlea3g' className="mx-auto max-w-xl px-4 py-14 text-center">
      <Users id='features-specialty-chat-presentation-specialtyrequestpagecontent-users-4-oebn2a' className="mx-auto h-12 w-12 text-primary" />
      <h1 id='features-specialty-chat-presentation-specialtyrequestpagecontent-heading-5-sl8z5b' className="mt-4 text-2xl font-bold">{copy.title}</h1>
      <p id='features-specialty-chat-presentation-specialtyrequestpagecontent-text-6-61q4il' className="mt-2 text-on-surface-variant">{copy.login}</p>
      <Link id='features-specialty-chat-presentation-specialtyrequestpagecontent-link-7-xqkgfm' href="/login" className="mt-6 inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-on-primary">{copy.signIn}</Link>
    </main>
  );

  return (
    <main id='features-specialty-chat-presentation-specialtyrequestpagecontent-main-8-l1lg2k' className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8" dir={isRTL ? "rtl" : "ltr"}>
      <div id='features-specialty-chat-presentation-specialtyrequestpagecontent-div-9-udkylx' className="mb-5 flex items-start gap-3">
        <div id='features-specialty-chat-presentation-specialtyrequestpagecontent-div-14-s2gqvh'><h1 id='features-specialty-chat-presentation-specialtyrequestpagecontent-heading-15-oogfb5' className="text-2xl font-bold">{copy.title}</h1><p id='features-specialty-chat-presentation-specialtyrequestpagecontent-text-16-vqsp8n' className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">{copy.subtitle}</p></div>
      </div>

      <form id="features-specialty-chat-presentation-specialtyrequestpagecontent-form-17-1govqx" onSubmit={submit} className="space-y-6 rounded-3xl border border-outline-variant bg-surface p-4 shadow-sm sm:p-6">
        <fieldset id='features-specialty-chat-presentation-specialtyrequestpagecontent-fieldset-18-mdxwtk' disabled={busy || result?.kind === "success"} className="min-w-0 space-y-6 disabled:opacity-70">
          <div id='features-specialty-chat-presentation-specialtyrequestpagecontent-div-19-ploqh2' className={`${CATEGORY_TABS_PAIR_CLASS} min-w-0`}>
            <CategoryTabsStrip
              id="features-specialty-chat-presentation-specialtyrequestpagecontent-div-21-jyuzl3"
              items={mains.map((item) => ({
                id: String(item.id),
                label: locale === "ar" ? item.nameAr : item.nameEn,
                imageUrl: item.imageUrl,
              }))}
              level="main"
              selectedId={mainId}
              onSelect={(id) => {
                setMainId(id);
                setSubId("");
                setResult(null);
              }}
            />

            {main ? (
              <CategoryTabsStrip
                id="features-specialty-chat-presentation-specialtyrequestpagecontent-div-24-17swxo"
                items={subs.map((item) => ({
                  id: String(item.originalId),
                  label: locale === "ar" ? item.nameAr : item.nameEn,
                  imageUrl: item.imageUrl,
                }))}
                level="sub"
                selectedId={subId}
                onSelect={(id) => {
                  setSubId(id);
                  setResult(null);
                }}
              />
            ) : null}
          </div>

          <label id='features-specialty-chat-presentation-specialtyrequestpagecontent-label-25-xn6mhj' className="grid gap-2 font-bold">{copy.message}
            <textarea id="features-specialty-chat-presentation-specialtyrequestpagecontent-textarea-26-umyz1m" value={message} onChange={(event) => { setMessage(event.target.value.slice(0, 800)); setResult(null); }} maxLength={800} rows={6} className="min-h-40 w-full min-w-0 max-w-full resize-y rounded-2xl border border-outline-variant bg-surface px-4 py-3 font-normal" placeholder={copy.placeholder} required />
            <span id='features-specialty-chat-presentation-specialtyrequestpagecontent-text-27-bnkpac' className="text-end text-xs font-normal text-on-surface-variant">{message.length}/800</span>
          </label>
        </fieldset>

        {result ? <p id='features-specialty-chat-presentation-specialtyrequestpagecontent-text-28-9hi09l' className={`rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${result.kind === "success" ? "bg-success/15 text-on-surface" : result.kind === "empty" ? "bg-warning/15 text-on-surface" : "bg-error/15 text-error"}`} role={result.kind === "error" ? "alert" : "status"}>
          {result.kind === "success" ? <MessageCircle id='features-specialty-chat-presentation-specialtyrequestpagecontent-messagecircle-29-c1fqbb' className="me-2 inline h-5 w-5" /> : null}{result.message}
        </p> : null}

        <button id='features-specialty-chat-presentation-specialtyrequestpagecontent-button-30-dd6gpv' type="submit" disabled={busy || !main || !sub || !message.trim() || result?.kind === "success"} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-lg font-bold text-on-primary disabled:opacity-50">
          {busy ? <Loader2 id='features-specialty-chat-presentation-specialtyrequestpagecontent-loader2-31-4kuise' className="h-5 w-5 animate-spin" /> : <Send id='features-specialty-chat-presentation-specialtyrequestpagecontent-send-32-z3yuwl' className="h-5 w-5" />}{copy.submit}
        </button>
      </form>
    </main>
  );
}
