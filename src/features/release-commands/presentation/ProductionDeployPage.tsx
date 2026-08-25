"use client";

import { Loader2, RefreshCw, Rocket, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import { productionDeployStageLabel } from "@/features/release-commands/domain/production-deploy-report";
import { useProductionDeploy } from "@/features/release-commands/presentation/hooks/use-production-deploy";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  REMOTE_DEPLOY_ALL_CONFIRMATION,
  REMOTE_DEPLOY_ALL_STAGES,
  type RemoteDeployAllStage,
} from "@asol/vercel-deploy-core/remote-deploy-contracts";

const TIMELINE: readonly RemoteDeployAllStage[] = REMOTE_DEPLOY_ALL_STAGES.filter(
  (stage) => stage !== "idle",
);

const ERROR_LABELS: Readonly<Record<string, string>> = {
  productionDeployAlreadyRunning: "هناك عملية نشر قيد التنفيذ بالفعل.",
  productionDeployConfirmationRequired: "عبارة التأكيد غير صحيحة.",
  productionDeployNotConfigured: "إعدادات النشر عن بُعد غير مكتملة على الخادم.",
  forbidden: "هذه الصفحة مخصصة للسوبر أدمن فقط.",
};

function errorText(code: string): string {
  return ERROR_LABELS[code] ?? code;
}

/**
 * Production release console for the super admin.
 *
 * The page starts nothing by itself and holds no credential: it asks the
 * Business API to start `deploy:all` inside the release sandbox, then reads
 * the run's stage, log tail, and outcome until it finishes.
 */
export function ProductionDeployPage() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const authorized = isSuperAdmin(session);
  const { result, running, starting, error, start } = useProductionDeploy();
  const [confirmation, setConfirmation] = React.useState("");
  const logRef = React.useRef<HTMLPreElement | null>(null);

  React.useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
  }, [authorized, isLoading, router, session]);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [result?.logTail]);

  if (isLoading || !authorized) return null;

  const snapshot = result?.snapshot;
  const readiness = result?.readiness;
  const armed = confirmation.trim() === REMOTE_DEPLOY_ALL_CONFIRMATION && !running && !starting;
  const currentIndex = snapshot ? TIMELINE.indexOf(snapshot.stage) : -1;

  return (
    <main dir="rtl" className="mx-auto w-full max-w-3xl space-y-4 p-4 pb-24">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Rocket className="h-5 w-5" aria-hidden />
          النشر إلى الإنتاج
        </h1>
        <p className="text-sm text-muted-foreground">
          يشغّل هذا الإجراء <code>deploy:all</code> كاملًا داخل بيئة نشر معزولة، ولا تمر أي أسرار
          عبر المتصفح.
        </p>
      </header>

      {readiness && !readiness.ready ? (
        <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            إعدادات ناقصة على الخادم
          </p>
          <ul className="mt-2 list-inside list-disc" dir="ltr">
            {readiness.missingConfiguration.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border p-3">
        <label className="block text-sm font-medium" htmlFor="production-deploy-confirmation">
          اكتب «{REMOTE_DEPLOY_ALL_CONFIRMATION}» للتأكيد
        </label>
        <Input
          id="production-deploy-confirmation"
          value={confirmation}
          dir="ltr"
          autoComplete="off"
          aria-label="عبارة تأكيد النشر"
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <Button
          type="button"
          disabled={!armed}
          aria-label="بدء النشر إلى الإنتاج"
          className="w-full active:scale-[0.99] focus-visible:ring-2"
          onClick={() => {
            setConfirmation("");
            void start();
          }}
        >
          {starting || running ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Rocket className="h-4 w-4" aria-hidden />
          )}
          {running ? "جارٍ النشر…" : "Deploy All"}
        </Button>
        {error ? <p className="text-sm text-destructive">{errorText(error)}</p> : null}
      </section>

      <section className="space-y-2 rounded-lg border p-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <RefreshCw className="h-4 w-4" aria-hidden />
          الحالة
        </h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-muted-foreground">الحالة</dt>
          <dd>{snapshot?.status ?? "…"}</dd>
          <dt className="text-muted-foreground">المرحلة</dt>
          <dd>{snapshot ? productionDeployStageLabel(snapshot.stage) : "…"}</dd>
          <dt className="text-muted-foreground">المعرّف</dt>
          <dd dir="ltr">{snapshot?.requestId ?? "—"}</dd>
          <dt className="text-muted-foreground">البريد</dt>
          <dd>{snapshot?.emailStatus ?? "—"}</dd>
        </dl>
        <ol className="space-y-1 text-sm">
          {TIMELINE.map((stage, index) => (
            <li
              key={stage}
              className={
                currentIndex > index
                  ? "text-muted-foreground"
                  : currentIndex === index
                    ? "font-semibold"
                    : "opacity-60"
              }
            >
              {currentIndex > index ? "✓ " : currentIndex === index ? "• " : "○ "}
              {productionDeployStageLabel(stage)}
            </li>
          ))}
        </ol>
        {snapshot?.status === "failed" && snapshot.error ? (
          <p className="rounded border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
            {snapshot.error}
          </p>
        ) : null}
      </section>

      <section className="space-y-2 rounded-lg border p-3">
        <h2 className="text-sm font-semibold">السجل</h2>
        <pre
          ref={logRef}
          dir="ltr"
          className="max-h-80 overflow-auto rounded bg-muted p-2 text-xs leading-5"
        >
          {result?.logTail || "لا يوجد سجل بعد."}
        </pre>
      </section>
    </main>
  );
}
