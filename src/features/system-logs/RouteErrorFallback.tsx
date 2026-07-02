"use client";

import { useEffect } from "react";

import { reportSystemIssue } from "@/features/system-logs/report-system-issue";

interface RouteErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  feature: string;
  route: string;
}

export function RouteErrorFallback({
  error,
  reset,
  feature,
  route,
}: RouteErrorFallbackProps) {
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
    <main className="container mx-auto max-w-lg px-4 py-12 text-center" dir="rtl">
      <h1 className="text-xl font-bold text-error">حدث خطأ في الصفحة</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        تم التقاط تفاصيل الخطأ. يمكنك إعادة محاولة فتح الصفحة.
      </p>
      <button type="button" className="auth-cta mt-5 px-6" onClick={reset}>
        إعادة المحاولة
      </button>
    </main>
  );
}

