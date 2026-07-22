"use client";

import * as React from "react";
import { Send, X, Users, Loader2 } from "lucide-react";
import { categoryService } from "@/features/categories";
import { useSession } from "@/features/auth/components/SessionProvider";
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
  const [open, setOpen] = React.useState(false);
  const [mainId, setMainId] = React.useState("");
  const [subId, setSubId] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState("");
  const mains = React.useMemo(() => categoryService.getProfileMainOptions(), []);
  const main = mains.find((item) => item.id === Number(mainId));
  const subs = main ? getSpecialtyChatSubOptions(main) : [];
  const sub = subs.find((item) => item.originalId === Number(subId));

  if (!session) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!main || !sub || !message.trim()) return;
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
        className="asol-control-icon flex items-center justify-center rounded-full text-primary transition hover:bg-primary-container"
        aria-label="إرسال طلب إلى مقدمي الخدمات"
        title="طلب من مقدمي الخدمات"
        onClick={() => setOpen(true)}
      >
        <Send className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="w-full max-w-lg rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl" dir="rtl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-primary"><Users className="h-5 w-5" /></span>
                <div><h2 className="text-lg font-bold">طلب من مقدمي الخدمات</h2><p className="text-xs text-muted-foreground">اختر تخصصًا واحدًا، وسيكون كل رد خاصًا بك.</p></div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="asol-control-icon rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">التخصص الرئيسي
                <select value={mainId} onChange={(e) => { setMainId(e.target.value); setSubId(""); }} className="rounded-xl border border-outline-variant bg-surface px-3 py-3 font-normal" required>
                  <option value="">اختر التخصص</option>{mains.map((item) => <option key={item.id} value={item.id}>{item.nameAr}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">التخصص الفرعي
                <select value={subId} onChange={(e) => setSubId(e.target.value)} disabled={!main} className="rounded-xl border border-outline-variant bg-surface px-3 py-3 font-normal disabled:opacity-50" required>
                  <option value="">اختر التخصص الفرعي</option>{subs.map((item) => <option key={item.originalId} value={item.originalId}>{item.nameAr}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 grid gap-2 text-sm font-semibold">نص الطلب
              <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 800))} maxLength={800} rows={5} className="resize-none rounded-xl border border-outline-variant bg-surface px-3 py-3 font-normal" placeholder="اكتب ما تحتاجه بوضوح..." required />
              <span className="text-end text-xs text-muted-foreground">{message.length}/800</span>
            </label>
            {result ? <p className="mt-3 rounded-xl bg-primary-container/40 px-3 py-2 text-sm" role="status">{result}</p> : null}
            <button type="submit" disabled={busy || !main || !sub || !message.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-50">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} إرسال الطلب
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
