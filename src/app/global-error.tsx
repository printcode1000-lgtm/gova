"use client";

export default function GlobalError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="container mx-auto max-w-lg px-4 py-12 text-center">
          <h1 className="text-xl font-bold text-error">
            حدث خطأ غير متوقع
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            تم تسجيل تفاصيل الخطأ في سجل النظام.
          </p>
          <button type="button" className="auth-cta mt-5 px-6" onClick={reset}>
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
