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
        <Link id='features-specialty-chat-presentation-specialtyrequestcomposer-link-1-2gafg1'
          href="/specialty-request"
          className={triggerClassName}
          aria-label={trigger}
          title={trigger}
        >
          <Send id='features-specialty-chat-presentation-specialtyrequestcomposer-send-2-goefxa' className="h-5 w-5" />
        </Link>
      ) : (
        <button id='features-specialty-chat-presentation-specialtyrequestcomposer-button-3-ffayfe'
          type="button"
          className={triggerClassName}
          aria-label={trigger}
          onClick={() => setShowLoginDialog(true)}
        >
          <Send id='features-specialty-chat-presentation-specialtyrequestcomposer-send-4-xn57iq' className="h-5 w-5" />
        </button>
      )}

      {showLoginDialog ? (
        <div id='features-specialty-chat-presentation-specialtyrequestcomposer-div-5-ain9t5'
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby='features-specialty-chat-presentation-specialtyrequestcomposer-heading-9-ilzhda'
        >
          <div id='features-specialty-chat-presentation-specialtyrequestcomposer-div-6-hd7six'
            className="w-full max-w-sm rounded-3xl border border-outline-variant bg-surface p-5 text-center shadow-2xl"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <span id='features-specialty-chat-presentation-specialtyrequestcomposer-text-7-nne0ds' className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-primary">
              <Users id='features-specialty-chat-presentation-specialtyrequestcomposer-users-8-zygj8l' className="h-6 w-6" aria-hidden />
            </span>
            <h2 id='features-specialty-chat-presentation-specialtyrequestcomposer-heading-9-ilzhda' className="mt-4 text-lg font-bold">
              {locale === "ar" ? "تسجيل الدخول مطلوب" : "Sign-in required"}
            </h2>
            <p id='features-specialty-chat-presentation-specialtyrequestcomposer-text-10-ywimqk' className="mt-2 text-sm leading-6 text-on-surface-variant">
              {locale === "ar"
                ? "سجّل الدخول لإرسال طلب إلى مقدمي الخدمات واستقبال ردودهم الخاصة."
                : "Sign in to send a request and receive private replies."}
            </p>
            <div id='features-specialty-chat-presentation-specialtyrequestcomposer-div-11-qelsyi' className="mt-5 grid grid-cols-2 gap-2">
              <Link id='features-specialty-chat-presentation-specialtyrequestcomposer-link-12-o6guwd'
                href="/login"
                onClick={() => setShowLoginDialog(false)}
                className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary"
              >
                {locale === "ar" ? "تسجيل الدخول" : "Sign in"}
              </Link>
              <button id='features-specialty-chat-presentation-specialtyrequestcomposer-button-13-8u3m4w'
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
