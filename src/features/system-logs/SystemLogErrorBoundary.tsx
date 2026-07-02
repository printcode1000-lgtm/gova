"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";
import { setSystemLogCollectorAuthorized } from "@/features/system-logs/system-log-store";

interface Props {
  children: ReactNode;
  authorized: boolean;
}

interface State {
  error: Error | null;
}

class SystemLogErrorBoundaryInner extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    setSystemLogCollectorAuthorized(this.props.authorized);
    const enriched = new Error(error.message);
    enriched.name = error.name || "ReactRenderError";
    enriched.stack = [error.stack, info.componentStack].filter(Boolean).join("\n");
    reportSystemIssue({
      feature: "React",
      operation: "render-or-lifecycle",
      error: enriched,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="container mx-auto max-w-lg px-4 py-12 text-center" dir="rtl">
        <h1 className="text-xl font-bold text-error">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          تم التقاط تفاصيل العطل في سجل السوبر أدمن.
        </p>
        <button
          type="button"
          className="auth-cta mt-5 px-6"
          onClick={() => this.setState({ error: null })}
        >
          إعادة المحاولة
        </button>
      </main>
    );
  }
}

export function SystemLogErrorBoundary({ children }: { children: ReactNode }) {
  const { session } = useSession();
  return (
    <SystemLogErrorBoundaryInner authorized={isSuperAdmin(session)}>
      {children}
    </SystemLogErrorBoundaryInner>
  );
}
