"use client";

import { SIMULATION_USERS } from "@asol/simulation-core";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useSimulationUsersBootstrap } from "./use-simulation-users-bootstrap";

export function SimulationUsersStatus() {
  const state = useSimulationUsersBootstrap();
  if (!state.allowed) return null;

  return (
    <section id="simulation.simulation-users-status.section" className="min-w-0 space-y-3 rounded-2xl border border-outline-variant bg-surface p-3 sm:p-4">
      <div id="simulation.simulation-users-status.div" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div id="simulation.simulation-users-status.div.2" className="min-w-0">
          <h2 id="simulation.simulation-users-status.h2" className="font-bold text-on-surface">مستخدمو المحاكاة</h2>
          <p id="simulation.simulation-users-status.p" className="break-words text-xs text-on-surface-variant">
            تسعة حسابات ثابتة تُنشأ أو تُراجع في قاعدة بيانات البيئة الحالية.
          </p>
        </div>
        <Button id="simulation.simulation-users-status.button" ui={{ uid: "super-admin.simulation.ensure-users-7q2o4Z", id: "super-admin.simulation.ensure-users", kind: "action", action: "ensure-simulation-users", part: "status" }}
          type="button"
          variant="outline"
          onClick={() => void state.ensure()}
          disabled={state.busy}
          className="w-full shrink-0 sm:w-auto"
        >
          {state.busy ? <Loader2 id="simulation.simulation-users-status.loader2" className="h-4 w-4 animate-spin" /> : <RefreshCw id="simulation.simulation-users-status.refresh-cw" className="h-4 w-4" />}
          مراجعة الحسابات
        </Button>
      </div>
      {state.error ? <p id="simulation.simulation-users-status.p.2" className="break-words rounded-xl bg-error/10 p-3 text-sm text-error">{state.error}</p> : null}
      <div id="simulation.simulation-users-status.div.3" className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SIMULATION_USERS.map((user) => {
          const result = state.users.find((candidate) => candidate.id === user.id);
          const failed = result?.status === "failed";
          const specialty = result?.specialtySelection;
          return (
            <div key={user.id} className="flex min-w-0 items-start gap-2 rounded-xl bg-surface-container-low p-3 text-sm">
              {failed ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden />
              ) : result ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-on-surface-variant" aria-hidden />
              )}
              <div className="min-w-0 flex-1 break-words">
                <div className="font-semibold text-on-surface">{user.storeName}</div>
                <div className="text-xs text-on-surface-variant" dir="ltr">{user.phone}</div>
                {specialty ? (
                  <div className="mt-1 space-y-0.5 text-xs text-on-surface-variant">
                    <div>
                      التصنيف الرئيسي: <span className="font-semibold text-on-surface">{specialty.main.nameAr}</span>
                    </div>
                    {specialty.sub ? (
                      <div>
                        التصنيف الفرعي: <span className="font-semibold text-on-surface">{specialty.sub.nameAr}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {failed ? <div className="break-words text-xs text-error">{result.error}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
