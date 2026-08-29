"use client";

import { useEffect } from "react";
import { reportSystemIssue } from '@asol/system-logs-core';
import { registerBrowserPorts } from "@/core/composition/browser-ports";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <html lang="ar" dir="rtl">
      <body>
        <main {...uiAttributes({ uid: "global-error.main.2-C33mPx", id: "global-error.main.2" })} id="global-error.main" className="container mx-auto max-w-lg px-4 py-12 text-center">
          <h1 {...uiAttributes({ uid: "global-error.h1.2-lE5AZO", id: "global-error.h1.2" })} id="global-error.h1" className="text-xl font-bold text-error">حدث خطأ غير متوقع</h1>
          <p {...uiAttributes({ uid: "global-error.p.2-5LxozQ", id: "global-error.p.2" })} id="global-error.p" className="mt-2 text-sm text-on-surface-variant">
            تم تسجيل تفاصيل الخطأ في سجل النظام.
          </p>
          <button {...uiAttributes({ uid: "global-error.button.2-tEBTG3", id: "global-error.button.2" })} id="global-error.button" type="button" className="auth-cta mt-5 px-6" onClick={reset}>
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
