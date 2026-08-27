"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Users } from "lucide-react";

import { useSession } from "@/features/auth/ui";
import { useResolvedColorScheme } from "@/shared/preferences";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/utils";

/** Header entry point. The request composer itself is a full page. */
export function SpecialtyRequestComposer() {
  const { session } = useSession();
  const { locale, isRTL } = useTranslation();
  const resolvedScheme = useResolvedColorScheme();
  const [showLoginDialog, setShowLoginDialog] = React.useState(false);
  const trigger = locale === "ar" ? "طلب من مقدمي الخدمات" : "Request from service providers";

  const triggerClassName = cn(
    "asol-control-icon flex items-center justify-center rounded-full transition-all duration-200",
    resolvedScheme === "dark"
      ? "text-primary active:bg-surface-variant"
      : "text-blue-900 active:bg-blue-200",
  );

  return (
    <>
      {session?.sessionToken ? (
        <Link id="specialty-chat.specialty-request-composer.link"
          href="/specialty-request"
          className={triggerClassName}
          aria-label={trigger}
          title={trigger}
        >
          <Send id="specialty-chat.specialty-request-composer.send" className="h-5 w-5" />
        </Link>
      ) : (
        <button id="specialty-chat.specialty-request-composer.button"
          type="button"
          className={triggerClassName}
          aria-label={trigger}
          onClick={() => setShowLoginDialog(true)}
        >
          <Send id="specialty-chat.specialty-request-composer.send.2" className="h-5 w-5" />
        </button>
      )}

      {showLoginDialog ? (
        <div id="specialty-chat.specialty-request-composer.div"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="specialty-login-title"
        >
          <div id="specialty-chat.specialty-request-composer.div.2"
            className="w-full max-w-sm rounded-3xl border border-outline-variant bg-surface p-5 text-center shadow-2xl"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <span id="specialty-chat.specialty-request-composer.span" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary">
              <Users id="specialty-chat.specialty-request-composer.users" className="h-6 w-6" aria-hidden />
            </span>
            <h2 id="specialty-login-title" className="mt-4 text-lg font-bold">
              {locale === "ar" ? "تسجيل الدخول مطلوب" : "Sign-in required"}
            </h2>
            <p id="specialty-chat.specialty-request-composer.p" className="mt-2 text-sm leading-6 text-on-surface-variant">
              {locale === "ar"
                ? "سجّل الدخول لإرسال طلب إلى مقدمي الخدمات واستقبال ردودهم الخاصة."
                : "Sign in to send a request and receive private replies."}
            </p>
            <div id="specialty-chat.specialty-request-composer.div.3" className="mt-5 grid grid-cols-2 gap-2">
              <Link id="specialty-chat.specialty-request-composer.link.2"
                href="/login"
                onClick={() => setShowLoginDialog(false)}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary"
              >
                {locale === "ar" ? "تسجيل الدخول" : "Sign in"}
              </Link>
              <button id="specialty-chat.specialty-request-composer.button.2"
                type="button"
                onClick={() => setShowLoginDialog(false)}
                className="rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-sm font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
