"use client";

import { SIMULATION_USERS } from "@asol/simulation-core";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useSimulationUsersBootstrap } from "./use-simulation-users-bootstrap";

export function SimulationUsersStatus() {
  const state = useSimulationUsersBootstrap();
  if (!state.allowed) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-outline-variant bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-on-surface">مستخدمو المحاكاة</h2>
          <p className="text-xs text-on-surface-variant">
            تسعة حسابات ثابتة تُنشأ أو تُراجع في قاعدة بيانات البيئة الحالية.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void state.ensure()} disabled={state.busy}>
          {state.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          مراجعة الحسابات
        </Button>
      </div>
      {state.error ? <p className="rounded-xl bg-error/10 p-3 text-sm text-error">{state.error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SIMULATION_USERS.map((user) => {
          const result = state.users.find((candidate) => candidate.id === user.id);
          const failed = result?.status === "failed";
          return (
            <div key={user.id} className="flex items-center gap-2 rounded-xl bg-surface-container-low p-3 text-sm">
              {failed ? (
                <XCircle className="h-4 w-4 shrink-0 text-error" aria-hidden />
              ) : result ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-on-surface-variant" aria-hidden />
              )}
              <div className="min-w-0">
                <div className="font-semibold text-on-surface">{user.storeName}</div>
                <div className="text-xs text-on-surface-variant" dir="ltr">{user.phone}</div>
                {failed ? <div className="break-words text-xs text-error">{result.error}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
