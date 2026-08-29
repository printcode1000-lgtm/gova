"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { reportSystemIssue } from '@asol/system-logs-core';
import { setSystemLogCollectorAuthorized } from "@/features/system-logs/application/system-log-store";
import { uiAttributes } from "@asol/ui-registry-core";

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
      <main {...uiAttributes({ uid: "system-logs.system-log-error-boundary.main.2-D8gkr0", id: "system-logs.system-log-error-boundary.main.2" })} id="system-logs.system-log-error-boundary.main" className="container mx-auto max-w-lg px-4 py-12 text-center" dir="rtl">
        <h1 {...uiAttributes({ uid: "system-logs.system-log-error-boundary.h1.2-W6Whup", id: "system-logs.system-log-error-boundary.h1.2" })} id="system-logs.system-log-error-boundary.h1" className="text-xl font-bold text-error">حدث خطأ غير متوقع</h1>
        <p {...uiAttributes({ uid: "system-logs.system-log-error-boundary.p.2-BwLoH8", id: "system-logs.system-log-error-boundary.p.2" })} id="system-logs.system-log-error-boundary.p" className="mt-2 text-sm text-on-surface-variant">
          تم التقاط تفاصيل العطل في سجل السوبر أدمن.
        </p>
        <button {...uiAttributes({ uid: "system-logs.system-log-error-boundary.button.2-YHz4NS", id: "system-logs.system-log-error-boundary.button.2" })} id="system-logs.system-log-error-boundary.button"
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
