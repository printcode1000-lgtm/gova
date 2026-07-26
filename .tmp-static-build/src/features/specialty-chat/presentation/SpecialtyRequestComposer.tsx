"use client";

import * as React from "react";
import { Send, X, Users, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { categoryService } from "@/features/categories";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useResolvedColorScheme } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { specialtyChatClient } from "../application/specialty-chat-client";
import { getSpecialtyChatSubOptions } from "../domain/specialty-options";

function makeId(prefix: string) {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${value.replace(/-/g, "")}`;
}

export function SpecialtyRequestComposer() {
  const { session } = useSession();
  const resolvedScheme = useResolvedColorScheme();
  const [open, setOpen] = React.useState(false);
  const [showLoginDialog, setShowLoginDialog] = React.useState(false);
  const [mainId, setMainId] = React.useState("");
  const [subId, setSubId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState("");
  const mains = React.useMemo(() => categoryService.getProfileMainOptions(), []);
  const main = mains.find((item) => item.id === Number(mainId));
  const subs = main ? getSpecialtyChatSubOptions(main) : [];
  const sub = subs.find((item) => item.originalId === Number(subId));

  React.useEffect(() => {
    if (!open && !showLoginDialog) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setShowLoginDialog(false);
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, showLoginDialog]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.sessionToken || !main || !sub || !message.trim()) return;
    setBusy(true);
    setResult("");
    try {
      const sent = await specialtyChatClient.sendRequest(session, {
        requestId: makeId("req"),
        mainCategoryId: main.id,
        subcategoryId: sub.originalId!,
        mainCategoryName: main.nameAr,
        subcategoryName: sub.nameAr,
        message: message.trim(),
      });
      setResult(`تم قبول الإرسال إلى ${sent.acceptedUsers} من مقدمي الخدمة. غير المتاح: ${sent.unavailableUsers}.`);
      setMessage("");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "تعذر إرسال الطلب.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={cn(
          "asol-control-icon flex items-center justify-center rounded-full transition-all duration-200",
          resolvedScheme === "dark"
            ? "text-primary hover:bg-surface-container-high active:bg-surface-variant"
            : "text-blue-900 hover:bg-blue-100/70 active:bg-blue-200",
        )}
        aria-label="إرسال طلب إلى مقدمي الخدمات"
        title="طلب من مقدمي الخدمات"
        onClick={() => {
          if (session?.sessionToken) {
            setOpen(true);
          } else {
            setShowLoginDialog(true);
          }
        }}
      >
        <Send className="h-5 w-5" />
      </button>
      {showLoginDialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="specialty-login-title">
          <div className="w-full max-w-sm rounded-3xl border border-outline-variant bg-surface p-5 text-center shadow-2xl" dir="rtl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <h2 id="specialty-login-title" className="mt-4 text-lg font-bold text-on-surface">
              تسجيل الدخول مطلوب
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              يجب تسجيل الدخول أولًا حتى تتمكن من إرسال طلب إلى مقدمي الخدمات واستقبال ردودهم.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setShowLoginDialog(false)}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition hover:opacity-90"
              >
                تسجيل الدخول
              </Link>
              <button
                type="button"
                onClick={() => setShowLoginDialog(false)}
                className="rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-black/50 p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="specialty-request-title">
          <form onSubmit={submit} className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-y-auto overscroll-contain rounded-3xl bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:max-h-[min(92dvh,46rem)] sm:p-5" dir="rtl">
            <div className="mb-3 flex shrink-0 items-start justify-between gap-2 sm:mb-5 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-primary sm:h-11 sm:w-11"><Users className="h-4 w-4 sm:h-5 sm:w-5" /></span>
                <div className="min-w-0"><h2 id="specialty-request-title" className="text-base font-bold leading-tight sm:text-lg">طلب من مقدمي الخدمات</h2><p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">اختر تخصصًا واحدًا، وسيكون كل رد خاصًا بك.</p></div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="asol-control-icon shrink-0 rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <div className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="التخصص الرئيسي">
                  <div className="flex w-max min-w-full gap-2">
                    {mains.map((item) => {
                      const selected = mainId === String(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setMainId(String(item.id));
                            setSubId("");
                          }}
                          className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pe-3 ps-1.5 text-xs font-semibold transition sm:pe-4 sm:text-sm ${
                            selected
                              ? "border-primary bg-primary text-on-primary shadow-sm"
                              : "border-outline-variant bg-surface-container text-on-surface hover:border-primary/50 hover:bg-primary-container/40"
                          }`}
                        >
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt=""
                              width={32}
                              height={32}
                              className="h-7 w-7 shrink-0 rounded-full border border-current/20 object-cover sm:h-8 sm:w-8"
                            />
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-current/10 sm:h-8 sm:w-8">
                              <Users className="h-3.5 w-3.5" aria-hidden />
                            </span>
                          )}
                          {item.nameAr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {main ? (
                <div className="grid gap-2 rounded-2xl bg-surface-container-low p-2.5">
                  <div className="-mx-2.5 overflow-x-auto px-2.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="التخصص الفرعي">
                    <div className="flex w-max min-w-full gap-2">
                      {subs.map((item) => {
                        const value = String(item.originalId);
                        const selected = subId === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setSubId(value)}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pe-3 ps-1.5 text-xs font-semibold transition sm:pe-4 sm:text-sm ${
                              selected
                                ? "border-secondary bg-secondary text-secondary-foreground shadow-sm"
                                : "border-outline-variant bg-surface text-on-surface hover:border-secondary/50 hover:bg-secondary/10"
                            }`}
                          >
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt=""
                                width={32}
                                height={32}
                                className="h-7 w-7 shrink-0 rounded-full border border-current/20 object-cover sm:h-8 sm:w-8"
                              />
                            ) : (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-current/10 sm:h-8 sm:w-8">
                                <Users className="h-3.5 w-3.5" aria-hidden />
                              </span>
                            )}
                            {item.nameAr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <label className="mt-3 grid gap-2 text-sm font-semibold sm:mt-4">نص الطلب
              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 800))} maxLength={800} rows={4} className="min-h-24 max-h-[30dvh] resize-y rounded-xl border border-outline-variant bg-surface px-3 py-3 font-normal" placeholder="اكتب ما تحتاجه بوضوح..." required />
              <span className="text-end text-xs text-muted-foreground">{message.length}/800</span>
            </label>
            {result ? <p className="mt-3 rounded-xl bg-primary-container/40 px-3 py-2 text-sm" role="status">{result}</p> : null}
            <button type="submit" disabled={busy || !main || !sub || !message.trim()} className="sticky bottom-0 mt-3 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-on-primary shadow-[0_-8px_18px_var(--color-surface)] disabled:opacity-50 sm:mt-4">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} إرسال الطلب
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
