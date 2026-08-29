"use client";

import { useEffect } from "react";

import { reportSystemIssue } from '@asol/system-logs-core';
import { uiAttributes } from "@asol/ui-registry-core";

interface RouteErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  feature: string;
  route: string;
}

export function RouteErrorFallback({ id,
  error,
  reset,
  feature,
  route,
}: RouteErrorFallbackProps & { id?: string }) {
  useEffect(() => {
    const enriched = new Error(
      error.digest ? `${error.message} (digest: ${error.digest})` : error.message,
    );
    enriched.name = error.name || "NextRouteError";
    enriched.stack = error.stack;
    reportSystemIssue({
      feature,
      operation: "next-route-render",
      error: enriched,
      page: route,
    });
  }, [error, feature, route]);

  return (
    <main {...uiAttributes({ uid: "system-logs.route-error-fallback.main-S62AYW", id: "system-logs.route-error-fallback.main" })} id={id} className="container mx-auto max-w-lg px-4 py-12 text-center" dir="rtl">
      <h1 {...uiAttributes({ uid: "system-logs.route-error-fallback.h1-XINE9u", id: "system-logs.route-error-fallback.h1" })} className="text-xl font-bold text-error">حدث خطأ في الصفحة</h1>
      <p {...uiAttributes({ uid: "system-logs.route-error-fallback.p-0KrKGL", id: "system-logs.route-error-fallback.p" })} className="mt-2 text-sm text-on-surface-variant">
        تم التقاط تفاصيل الخطأ. يمكنك إعادة محاولة فتح الصفحة.
      </p>
      <button {...uiAttributes({ uid: "system-logs.route-error-fallback.button-7e9lIU", id: "system-logs.route-error-fallback.button" })} type="button" className="auth-cta mt-5 px-6" onClick={reset}>
        إعادة المحاولة
      </button>
    </main>
  );
}

