"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AlertTriangle, LockKeyhole, PackageX, ShieldAlert, Trash2, UserX } from "lucide-react";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { clearAllClientStorage } from "@/lib/storage/client-storage";
import { useTranslation } from "@/lib/i18n";
import { accountDeletionApiService } from "../services/account-deletion-api-service";
import { ACCOUNT_DELETION_PHRASE } from "../types";

const COPY = {
  ar: { title: "حذف حساب أصول", intro: "هذا الإجراء نهائي ولا يمكن التراجع عنه.", login: "يجب تسجيل الدخول أولًا حتى يمكن التحقق من مالك الحساب.", loginButton: "تسجيل الدخول", protected: "لا يمكن حذف حساب السوبر أدمن من داخل التطبيق.", removes: "ما الذي سيتم حذفه؟", items: ["الحساب وبيانات التسجيل وجلسات الإشعارات", "الملف الشخصي والتخصصات وبيانات التواصل", "كل المنتجات والصور والتقييمات والمتابعات", "البيانات المحلية مثل السلة والمفضلة والجلسة"], shared: "لن نحذف سجلات الطلبات أو السجلات المالية المشتركة مع أطراف أخرى؛ ستبقى لأغراض المحاسبة والنزاعات بعد إزالة هويتك وبياناتك الشخصية منها.", password: "كلمة المرور الحالية", phrase: "اكتب العبارة التالية كما هي", acknowledge: "أفهم أن الحذف نهائي وأنه لا يمكن استعادة الحساب أو المنتجات.", submit: "حذف حسابي نهائيًا", deleting: "جارٍ حذف الحساب…", invalid: "تحقق من كلمة المرور وعبارة التأكيد ثم حاول مرة أخرى.", contact: "هل تحتاج إلى مساعدة؟ تواصل معنا قبل الحذف" },
  en: { title: "Delete ASOL account", intro: "This action is permanent and cannot be undone.", login: "You must sign in first so account ownership can be verified.", loginButton: "Sign in", protected: "The super-admin account cannot be deleted from inside the app.", removes: "What will be deleted?", items: ["Account, registration data and notification sessions", "Profile, specialties and contact details", "All products, images, reviews and follows", "Local data such as cart, favorites and session"], shared: "Shared order and financial records will remain for accounting and disputes, but your identity and personal information will be removed from them.", password: "Current password", phrase: "Type this phrase exactly", acknowledge: "I understand deletion is permanent and the account and products cannot be restored.", submit: "Permanently delete my account", deleting: "Deleting account…", invalid: "Check the password and confirmation phrase, then try again.", contact: "Need help? Contact us before deleting" },
};

export function AccountDeletionPageContent() {
  const { isRTL } = useTranslation(); const c = isRTL ? COPY.ar : COPY.en;
  const { session, isLoading } = useSession();
  const [password,setPassword] = useState(""); const [phrase,setPhrase] = useState(""); const [accepted,setAccepted] = useState(false); const [state,setState] = useState<"idle"|"deleting"|"error">("idle");
  async function submit(event: FormEvent) { event.preventDefault(); if (!session || !accepted || phrase !== ACCOUNT_DELETION_PHRASE) { setState("error"); return; } setState("deleting"); try { await accountDeletionApiService.delete({ uid: session.uid, currentPassword: password, confirmation: phrase }); await clearAllClientStorage(); window.location.replace("/"); } catch { setState("error"); } }
  if (isLoading) return <main className="mx-auto max-w-3xl p-8"><div className="h-48 animate-pulse rounded-3xl bg-surface-container"/></main>;
  if (!session) return <main className="mx-auto max-w-2xl px-4 py-12" dir={isRTL?"rtl":"ltr"}><section className="rounded-3xl border border-outline/30 bg-surface p-8 text-center"><LockKeyhole className="mx-auto mb-4 h-12 w-12 text-primary"/><h1 className="text-2xl font-bold">{c.title}</h1><p className="my-5 text-on-surface-variant">{c.login}</p><Link href="/login" className="inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary">{c.loginButton}</Link></section></main>;
  if (isSuperAdmin(session)) return <main className="mx-auto max-w-2xl px-4 py-12" dir={isRTL?"rtl":"ltr"}><section className="rounded-3xl border border-error/30 bg-error/5 p-8 text-center"><ShieldAlert className="mx-auto mb-4 h-12 w-12 text-error"/><h1 className="text-2xl font-bold">{c.title}</h1><p className="mt-4 text-error">{c.protected}</p></section></main>;

  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8" dir={isRTL?"rtl":"ltr"}>
    <section className="rounded-3xl border border-error/30 bg-error/5 p-7"><AlertTriangle className="mb-4 h-12 w-12 text-error"/><h1 className="text-3xl font-bold text-error">{c.title}</h1><p className="mt-3 text-lg">{c.intro}</p></section>
    <section className="rounded-3xl border border-outline/30 bg-surface p-7"><h2 className="mb-5 text-xl font-bold">{c.removes}</h2><div className="grid gap-3 sm:grid-cols-2">{c.items.map((item,index)=>{const Icon=[UserX,PackageX,Trash2,LockKeyhole][index];return <div key={item} className="flex gap-3 rounded-xl bg-surface-container p-4"><Icon className="h-5 w-5 shrink-0 text-error"/><span>{item}</span></div>})}</div><p className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-on-surface-variant">{c.shared}</p></section>
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-outline/30 bg-surface p-7">
      <label className="block space-y-2 font-semibold">{c.password}<input type="password" autoComplete="current-password" required value={password} onChange={(e)=>setPassword(e.target.value)} className="block w-full rounded-xl border border-outline/40 bg-surface-container p-3"/></label>
      <label className="block space-y-2 font-semibold">{c.phrase}<code dir="ltr" className="block rounded-xl bg-surface-container p-3 text-center text-base">{ACCOUNT_DELETION_PHRASE}</code><input dir="ltr" required value={phrase} onChange={(e)=>setPhrase(e.target.value)} className="block w-full rounded-xl border border-outline/40 bg-surface-container p-3"/></label>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-error/20 p-4"><input type="checkbox" checked={accepted} onChange={(e)=>setAccepted(e.target.checked)} className="mt-1 h-5 w-5"/><span>{c.acknowledge}</span></label>
      {state === "error" && <p className="rounded-xl bg-red-100 p-3 text-red-800">{c.invalid}</p>}
      <button disabled={!accepted || phrase !== ACCOUNT_DELETION_PHRASE || state === "deleting"} className="flex w-full items-center justify-center gap-2 rounded-xl bg-error px-5 py-3 font-bold text-on-error disabled:opacity-50"><Trash2 className="h-5 w-5"/>{state === "deleting" ? c.deleting : c.submit}</button>
    </form>
    <Link href="/contact-us" className="block text-center font-semibold text-primary">{c.contact}</Link>
  </main>;
}
