"use client";

import { useEffect } from "react";

import { reportSystemIssue } from '@asol/system-logs-core';

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
    <main id={id} className="container mx-auto max-w-lg px-4 py-12 text-center" dir="rtl">
      <h1 id="features-system-logs-application-routeerrorfallback-heading-2-v586mc" className="text-xl font-bold text-error">حدث خطأ في الصفحة</h1>
      <p id="features-system-logs-application-routeerrorfallback-text-3-ekobwo" className="mt-2 text-sm text-on-surface-variant">
        تم التقاط تفاصيل الخطأ. يمكنك إعادة محاولة فتح الصفحة.
      </p>
      <button id="features-system-logs-application-routeerrorfallback-button-4-sa70bb" type="button" className="auth-cta mt-5 px-6" onClick={reset}>
        إعادة المحاولة
      </button>
    </main>
  );
}

