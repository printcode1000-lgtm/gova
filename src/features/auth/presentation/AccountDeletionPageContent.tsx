"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  LockKeyhole,
  PackageX,
  ShieldAlert,
  Trash2,
  UserX,
} from "lucide-react";
import {
  ACCOUNT_DELETION_PHRASE_AR,
  ACCOUNT_DELETION_PHRASE_EN,
  isAccountDeletionPhraseValid,
} from "@asol/auth-core";
import { useSession } from "@/features/auth/presentation/SessionProvider";
import { usePageSaveRegistration } from "@/features/page-save/ui";
import { isSuperAdmin } from "@/features/auth";
import { clearAllClientStorage } from '@/features/app-reset';
import { useTranslation } from "@/shared/i18n";
import { accountDeletionApiService } from "../application/services/account-deletion-api-service";
import { notifications } from "@/features/notifications";
import { uiAttributes } from "@asol/ui-registry-core";
import { foldPasswordDigits } from "@asol/auth-core";

const COPY = {
  ar: {
    title: "حذف حساب أصول",
    intro: "هذا الإجراء نهائي ولا يمكن التراجع عنه.",
    login: "يجب تسجيل الدخول أولًا حتى يمكن التحقق من مالك الحساب.",
    loginButton: "تسجيل الدخول",
    protected: "لا يمكن حذف حساب السوبر أدمن من داخل التطبيق.",
    removes: "ما الذي سيتم حذفه؟",
    items: [
      "الحساب وبيانات التسجيل وجلسات الإشعارات",
      "الملف الشخصي والتخصصات وبيانات التواصل",
      "كل المنتجات والصور والتقييمات والمتابعات",
      "البيانات المحلية مثل السلة والمفضلة والجلسة",
    ],
    shared:
      "لن نحذف سجلات الطلبات أو السجلات المالية المشتركة مع أطراف أخرى؛ ستبقى لأغراض المحاسبة والنزاعات بعد إزالة هويتك وبياناتك الشخصية منها.",
    password: "كلمة المرور الحالية",
    phrase: "اكتب إحدى العبارتين التاليتين كما هي",
    acknowledge: "أفهم أن الحذف نهائي وأنه لا يمكن استعادة الحساب أو المنتجات.",
    submit: "حذف حسابي نهائيًا",
    deleting: "جارٍ حذف الحساب…",
    invalidPassword: "كلمة المرور غير صحيحة.",
    invalidPhrase: "عبارة التأكيد غير مطابقة.",
    invalidSession: "انتهت جلستك. سجّل الدخول مجددًا ثم حاول مرة أخرى.",
    invalid: "تحقق من البيانات ثم حاول مرة أخرى.",
    contact: "هل تحتاج إلى مساعدة؟ تواصل معنا قبل الحذف",
  },
  en: {
    title: "Delete ASOL account",
    intro: "This action is permanent and cannot be undone.",
    login: "You must sign in first so account ownership can be verified.",
    loginButton: "Sign in",
    protected: "The super-admin account cannot be deleted from inside the app.",
    removes: "What will be deleted?",
    items: [
      "Account, registration data and notification sessions",
      "Profile, specialties and contact details",
      "All products, images, reviews and follows",
      "Local data such as cart, favorites and session",
    ],
    shared:
      "Shared order and financial records will remain for accounting and disputes, but your identity and personal information will be removed from them.",
    password: "Current password",
    phrase: "Type one of these phrases exactly",
    acknowledge:
      "I understand deletion is permanent and the account and products cannot be restored.",
    submit: "Permanently delete my account",
    deleting: "Deleting account…",
    invalidPassword: "The password is incorrect.",
    invalidPhrase: "The confirmation phrase does not match.",
    invalidSession: "Your session expired. Sign in again and retry.",
    invalid: "Check your details and try again.",
    contact: "Need help? Contact us before deleting",
  },
};

type ErrorKind = "password" | "phrase" | "session" | "generic";

export function AccountDeletionPageContent() {
  const { isRTL } = useTranslation();
  const c = isRTL ? COPY.ar : COPY.en;
  const { session, isLoading } = useSession();
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState<"idle" | "deleting" | "error">("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>("generic");

  const canDelete =
    Boolean(session?.sessionToken) &&
    accepted &&
    isAccountDeletionPhraseValid(phrase);

  usePageSaveRegistration({
    id: "account-deletion",
    label: c.title,
    returnPath: "/delete-account",
    enabled: Boolean(session),
    items: [
      {
        id: "account-deletion",
        label: c.submit,
        operation: "delete",
        isDirty: accepted || phrase.length > 0,
        canSave: canDelete,
      },
    ],
    isSaving: state === "deleting",
    canSave: canDelete,
    save: () => runDeletion(),
  });

  async function runDeletion(): Promise<boolean> {
    if (!session?.sessionToken || !accepted || !isAccountDeletionPhraseValid(phrase)) {
      setErrorKind(!session?.sessionToken ? "session" : "phrase");
      setState("error");
      return false;
    }
    setState("deleting");
    try {
      await notifications.unregisterDevice({ uid: session.uid, phone: session.phone });
      await accountDeletionApiService.delete({
        uid: session.uid,
        currentPassword: password,
        confirmation: phrase,
        sessionToken: session.sessionToken,
      });
      await clearAllClientStorage();
      window.location.replace("/");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "invalidCurrentPassword") setErrorKind("password");
      else if (message === "accountDeletionConfirmationInvalid") setErrorKind("phrase");
      else if (message === "sessionTokenInvalid" || message === "sessionTokenExpired") {
        setErrorKind("session");
      } else setErrorKind("generic");
      setState("error");
      return false;
    }
  }

  const errorMessage =
    errorKind === "password"
      ? c.invalidPassword
      : errorKind === "phrase"
        ? c.invalidPhrase
        : errorKind === "session"
          ? c.invalidSession
          : c.invalid;

  if (isLoading) {
    return (
      <main {...uiAttributes({ uid: "auth.account-deletion-page-content.main.5-15TlDg", id: "auth.account-deletion-page-content.main.5" })} id="auth.account-deletion-page-content.main" className="mx-auto max-w-3xl p-8">
        <div {...uiAttributes({ uid: "auth.account-deletion-page-content.div.5-IYira6", id: "auth.account-deletion-page-content.div.5" })} id="auth.account-deletion-page-content.div" className="h-48 animate-pulse rounded-3xl bg-surface-container" />
      </main>
    );
  }

  if (!session) {
    return (
      <main {...uiAttributes({ uid: "auth.account-deletion-page-content.main.6-ZC90lK", id: "auth.account-deletion-page-content.main.6" })} id="auth.account-deletion-page-content.main.2" className="mx-auto max-w-2xl px-4 py-12" dir={isRTL ? "rtl" : "ltr"}>
        <section {...uiAttributes({ uid: "auth.account-deletion-page-content.section.5-TyMAK8", id: "auth.account-deletion-page-content.section.5" })} id="auth.account-deletion-page-content.section" className="rounded-3xl border border-outline/30 bg-surface p-8 text-center">
          <LockKeyhole id="auth.account-deletion-page-content.lock-keyhole" className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 {...uiAttributes({ uid: "auth.account-deletion-page-content.h1.4-9U8YZx", id: "auth.account-deletion-page-content.h1.4" })} id="auth.account-deletion-page-content.h1" className="text-2xl font-bold">{c.title}</h1>
          <p {...uiAttributes({ uid: "auth.account-deletion-page-content.p.6-SSH3A4", id: "auth.account-deletion-page-content.p.6" })} id="auth.account-deletion-page-content.p" className="my-5 text-on-surface-variant">{c.login}</p>
          <Link id="auth.account-deletion-page-content.link"
            href="/login"
            className="inline-flex rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary"
          >
            {c.loginButton}
          </Link>
        </section>
      </main>
    );
  }

  if (isSuperAdmin(session)) {
    return (
      <main {...uiAttributes({ uid: "auth.account-deletion-page-content.main.7-Gi8Do3", id: "auth.account-deletion-page-content.main.7" })} id="auth.account-deletion-page-content.main.3" className="mx-auto max-w-2xl px-4 py-12" dir={isRTL ? "rtl" : "ltr"}>
        <section {...uiAttributes({ uid: "auth.account-deletion-page-content.section.6-JM3hFj", id: "auth.account-deletion-page-content.section.6" })} id="auth.account-deletion-page-content.section.2" className="rounded-3xl border border-error/30 bg-error/5 p-8 text-center">
          <ShieldAlert id="auth.account-deletion-page-content.shield-alert" className="mx-auto mb-4 h-12 w-12 text-error" />
          <h1 {...uiAttributes({ uid: "auth.account-deletion-page-content.h1.5-8bJwhM", id: "auth.account-deletion-page-content.h1.5" })} id="auth.account-deletion-page-content.h1.2" className="text-2xl font-bold">{c.title}</h1>
          <p {...uiAttributes({ uid: "auth.account-deletion-page-content.p.7-p42HjX", id: "auth.account-deletion-page-content.p.7" })} id="auth.account-deletion-page-content.p.2" className="mt-4 text-error">{c.protected}</p>
        </section>
      </main>
    );
  }

  return (
    <main {...uiAttributes({ uid: "auth.account-deletion-page-content.main.8-dqv8V9", id: "auth.account-deletion-page-content.main.8" })} id="auth.account-deletion-page-content.main.4" className="mx-auto max-w-3xl space-y-6 px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <section {...uiAttributes({ uid: "auth.account-deletion-page-content.section.7-8qbuUq", id: "auth.account-deletion-page-content.section.7" })} id="auth.account-deletion-page-content.section.3" className="rounded-3xl border border-error/30 bg-error/5 p-7">
        <AlertTriangle id="auth.account-deletion-page-content.alert-triangle" className="mb-4 h-12 w-12 text-error" />
        <h1 {...uiAttributes({ uid: "auth.account-deletion-page-content.h1.6-TI5Y3J", id: "auth.account-deletion-page-content.h1.6" })} id="auth.account-deletion-page-content.h1.3" className="text-3xl font-bold text-error">{c.title}</h1>
        <p {...uiAttributes({ uid: "auth.account-deletion-page-content.p.8-WCBAA9", id: "auth.account-deletion-page-content.p.8" })} id="auth.account-deletion-page-content.p.3" className="mt-3 text-lg">{c.intro}</p>
      </section>
      <section {...uiAttributes({ uid: "auth.account-deletion-page-content.section.8-35FWDq", id: "auth.account-deletion-page-content.section.8" })} id="auth.account-deletion-page-content.section.4" className="rounded-3xl border border-outline/30 bg-surface p-7">
        <h2 {...uiAttributes({ uid: "auth.account-deletion-page-content.h2.2-MN0n7A", id: "auth.account-deletion-page-content.h2.2" })} id="auth.account-deletion-page-content.h2" className="mb-5 text-xl font-bold">{c.removes}</h2>
        <div {...uiAttributes({ uid: "auth.account-deletion-page-content.div.6-7Rdjwk", id: "auth.account-deletion-page-content.div.6" })} id="auth.account-deletion-page-content.div.2" className="grid gap-3 sm:grid-cols-2">
          {c.items.map((item, index) => {
            const Icon = [UserX, PackageX, Trash2, LockKeyhole][index];
            return (
              <div key={item} {...uiAttributes({ uid: "auth.account-deletion-page-content.div.7-DZg8D6", id: "auth.account-deletion-page-content.div.7" })} className="flex gap-3 rounded-xl bg-surface-container p-4">
                <Icon className="h-5 w-5 shrink-0 text-error" />
                <span {...uiAttributes({ uid: "auth.account-deletion-page-content.span.2-ltl8cJ", id: "auth.account-deletion-page-content.span.2" })}>{item}</span>
              </div>
            );
          })}
        </div>
        <p {...uiAttributes({ uid: "auth.account-deletion-page-content.p.9-Rt38vs", id: "auth.account-deletion-page-content.p.9" })} id="auth.account-deletion-page-content.p.4" className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-on-surface-variant">
          {c.shared}
        </p>
      </section>
      <div {...uiAttributes({ uid: "auth.account-deletion-page-content.div.8-WBa13U", id: "auth.account-deletion-page-content.div.8" })} id="auth.account-deletion-page-content.div.3" className="space-y-5 rounded-3xl border border-outline/30 bg-surface p-7">
        <label {...uiAttributes({ uid: "auth.account-deletion-page-content.label.4-zzOqn3", id: "auth.account-deletion-page-content.label.4" })} id="auth.account-deletion-page-content.label" className="block space-y-2 font-semibold">
          {c.password}
          <input {...uiAttributes({ uid: "auth.account-deletion-page-content.input.3-vQCY7S", id: "auth.account-deletion-page-content.input.3" })} id="auth.account-deletion-page-content.input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(foldPasswordDigits(e.target.value))}
            className="block w-full rounded-xl border border-outline/40 bg-surface-container p-3"
          />
        </label>
        <label {...uiAttributes({ uid: "auth.account-deletion-page-content.label.5-6EZ823", id: "auth.account-deletion-page-content.label.5" })} id="auth.account-deletion-page-content.label.2" className="block space-y-2 font-semibold">
          {c.phrase}
          <div {...uiAttributes({ uid: "auth.account-deletion-page-content.div.9-LJ1l3X", id: "auth.account-deletion-page-content.div.9" })} id="auth.account-deletion-page-content.div.4" className="space-y-2">
            <code dir="ltr" className="block rounded-xl bg-surface-container p-3 text-center text-base">
              {ACCOUNT_DELETION_PHRASE_AR}
            </code>
            <code dir="ltr" className="block rounded-xl bg-surface-container p-3 text-center text-base">
              {ACCOUNT_DELETION_PHRASE_EN}
            </code>
          </div>
          <input {...uiAttributes({ uid: "auth.account-deletion-page-content.input.4-G0YC6M", id: "auth.account-deletion-page-content.input.4" })} id="auth.account-deletion-page-content.input.2"
            dir="ltr"
            required
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            className="block w-full rounded-xl border border-outline/40 bg-surface-container p-3"
          />
        </label>
        <label {...uiAttributes({ uid: "auth.account-deletion-page-content.label.6-5LfhO2", id: "auth.account-deletion-page-content.label.6" })} id="auth.account-deletion-page-content.label.3" className="flex items-start gap-3 rounded-xl border border-error/20 p-4">
          <input {...uiAttributes({ uid: "account-delete-stage-yWONK1", id: "account-delete-stage", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "account-delete-stage" } })}
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span {...uiAttributes({ uid: "auth.account-deletion-page-content.span.3-mToD2X", id: "auth.account-deletion-page-content.span.3" })} id="auth.account-deletion-page-content.span">{c.acknowledge}</span>
        </label>
        {state === "error" && (
          <p {...uiAttributes({ uid: "auth.account-deletion-page-content.p.10-W4Mjgb", id: "auth.account-deletion-page-content.p.10" })} id="auth.account-deletion-page-content.p.5" className="rounded-xl bg-red-100 p-3 text-red-800">{errorMessage}</p>
        )}
      </div>
      <Link id="auth.account-deletion-page-content.link.2" href="/contact-us" className="block text-center font-semibold text-primary">
        {c.contact}
      </Link>
    </main>
  );
}
