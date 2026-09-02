"use client";

import { useEffect } from "react";
import { reportSystemIssue } from '@asol/system-logs-core';
import { registerBrowserPorts } from "@/core/composition/browser-ports";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    registerBrowserPorts();
    const enriched = new Error(
      error.digest ? `${error.message} (digest: ${error.digest})` : error.message,
    );
    enriched.name = error.name || "NextGlobalError";
    enriched.stack = error.stack;
    void reportSystemIssue({
      feature: "NextJS",
      operation: "global-error",
      error: enriched,
    });
  }, [error]);

  return (
    <html id="app-global-error-html-1-h3helz" lang="ar" dir="rtl">
      <body id="app-global-error-body-2-xdjzky">
        <main id='app-global-error-main-3-m0yes1' className="container mx-auto max-w-lg px-4 py-12 text-center">
          <h1 id='app-global-error-heading-4-9gbxqs' className="text-xl font-bold text-error">حدث خطأ غير متوقع</h1>
          <p id='app-global-error-text-5-rtwzif' className="mt-2 text-sm text-on-surface-variant">
            تم تسجيل تفاصيل الخطأ في سجل النظام.
          </p>
          <button id='app-global-error-button-6-xvkiwp' type="button" className="auth-cta mt-5 px-6" onClick={reset}>
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
