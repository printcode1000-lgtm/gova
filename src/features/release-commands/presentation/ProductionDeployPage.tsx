"use client";

import { Clipboard, Loader2, RefreshCw, Rocket, ShieldAlert, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import { productionDeployStageLabel } from "@/features/release-commands/domain/production-deploy-report";
import {
  deployElapsedMs,
  formatDeployDuration,
  stageTimings,
} from "@/features/release-commands/domain/production-deploy-timing";
import { useProductionDeploy } from "@/features/release-commands/presentation/hooks/use-production-deploy";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { NativeCore } from "@asol/native-core";
import {
  REMOTE_DEPLOY_ALL_CONFIRMATION,
  REMOTE_DEPLOY_ALL_STAGES,
  type RemoteDeployAllOptions,
  type RemoteDeployAllResumeMode,
  type RemoteDeployAllStage,
} from "@asol/vercel-deploy-core/remote-deploy-contracts";
import { deployAllBranchIds } from "@asol/release-core/console";
import { uiAttributes } from "@asol/ui-registry-core";

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
  const [tab, setTab] = React.useState<"deploy:all" | "deploy:push">("deploy:all");
  const [target, setTarget] = React.useState<PushTarget>("all");
  const [resumeMode, setResumeMode] = React.useState<RemoteDeployAllResumeMode>("full");
  const [branchId, setBranchId] = React.useState(DEPLOY_ALL_BRANCH_IDS[0] ?? "");
  const [serviceSmokeRebuild, setServiceSmokeRebuild] = React.useState(false);
  const logRef = React.useRef<HTMLPreElement | null>(null);
  const now = useTickingClock(running);

  React.useEffect(() => {
    if (!isLoading && !authorized) router.replace(session ? "/home" : "/login");
  }, [authorized, isLoading, router, session]);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [result?.logTail]);

  if (isLoading || !authorized) return null;

  const snapshot = result?.snapshot;
  const readiness = result?.readiness;
  const branchRequired = tab === "deploy:all" && (resumeMode === "from-branch" || resumeMode === "rerun-branch");
  const deployAllOptions: RemoteDeployAllOptions = {
    resumeMode,
    branchId: branchRequired ? branchId : undefined,
    serviceSmokeRebuild,
  };
  const armed =
    confirmation.trim() === REMOTE_DEPLOY_ALL_CONFIRMATION &&
    !running &&
    !starting &&
    (!branchRequired || Boolean(branchId));
  const currentIndex = snapshot ? TIMELINE.indexOf(snapshot.stage) : -1;
  const totalElapsed = snapshot ? deployElapsedMs(snapshot, now) : null;
  const timings = snapshot ? stageTimings(snapshot, now) : new Map();

  return (
    <main {...uiAttributes({ uid: "release-commands.production-deploy-page.main.2-7blC76", id: "release-commands.production-deploy-page.main.2" })} id="release-commands.production-deploy-page.main" dir="rtl" className="mx-auto w-full max-w-3xl min-w-0 space-y-4 p-4 pb-24">
      <header {...uiAttributes({ uid: "release-commands.production-deploy-page.header.2-YI87v3", id: "release-commands.production-deploy-page.header.2" })} id="release-commands.production-deploy-page.header" className="space-y-1">
        <h1 {...uiAttributes({ uid: "release-commands.production-deploy-page.h1.2-68V4YP", id: "release-commands.production-deploy-page.h1.2" })} id="release-commands.production-deploy-page.h1" className="flex items-center gap-2 text-xl font-bold">
          <Rocket id="release-commands.production-deploy-page.rocket" className="h-5 w-5" aria-hidden />
          النشر إلى الإنتاج
        </h1>
        <p {...uiAttributes({ uid: "release-commands.production-deploy-page.p.5-q9f2J6", id: "release-commands.production-deploy-page.p.5" })} id="release-commands.production-deploy-page.p" className="text-sm text-muted-foreground">
          يشغّل هذا الإجراء <code>deploy:all</code> كاملًا داخل بيئة نشر معزولة، ولا تمر أي أسرار
          عبر المتصفح.
        </p>
      </header>

      <div {...uiAttributes({ uid: "release-commands.production-deploy-page.div.5-1SrPsP", id: "release-commands.production-deploy-page.div.5" })} id="release-commands.production-deploy-page.div" className="grid grid-cols-2 gap-2" role="tablist" aria-label="نوع النشر">
        <Button id="release-commands.production-deploy-page.button" ui={{ uid: "production-deploy.tab-deploy-all-S2g8ZZ", id: "production-deploy.tab-deploy-all", kind: "action", action: "select-deploy-all-tab", part: "tabs" }} type="button" role="tab" aria-selected={tab === "deploy:all"} variant={tab === "deploy:all" ? "default" : "outline"} onClick={() => setTab("deploy:all")}>Deploy All</Button>
        <Button id="release-commands.production-deploy-page.button.2" ui={{ uid: "production-deploy.tab-deploy-push-QZMUS1", id: "production-deploy.tab-deploy-push", kind: "action", action: "select-deploy-push-tab", part: "tabs" }} type="button" role="tab" aria-selected={tab === "deploy:push"} variant={tab === "deploy:push" ? "default" : "outline"} onClick={() => setTab("deploy:push")}>Deploy Push</Button>
      </div>

      {readiness && !readiness.ready ? (
        <section {...uiAttributes({ uid: "release-commands.production-deploy-page.section.5-7NSE5p", id: "release-commands.production-deploy-page.section.5" })} id="release-commands.production-deploy-page.section" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p {...uiAttributes({ uid: "release-commands.production-deploy-page.p.6-KLKz8N", id: "release-commands.production-deploy-page.p.6" })} id="release-commands.production-deploy-page.p.2" className="flex items-center gap-2 font-semibold">
            <ShieldAlert id="release-commands.production-deploy-page.shield-alert" className="h-4 w-4" aria-hidden />
            إعدادات ناقصة على الخادم
          </p>
          <ul {...uiAttributes({ uid: "release-commands.production-deploy-page.ul.2-G9OXOU", id: "release-commands.production-deploy-page.ul.2" })} id="release-commands.production-deploy-page.ul" className="mt-2 list-inside list-disc" dir="ltr">
            {readiness.missingConfiguration.map((key) => (
              <li key={key} {...uiAttributes({ uid: "release-commands.production-deploy-page.li-TIqkv4", id: "release-commands.production-deploy-page.li" })}>{key}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section {...uiAttributes({ uid: "release-commands.production-deploy-page.section.6-8JKJ3T", id: "release-commands.production-deploy-page.section.6" })} id="release-commands.production-deploy-page.section.2" className="space-y-3 rounded-lg border p-3">
        {tab === "deploy:push" ? (
          <>
            <label {...uiAttributes({ uid: "release-commands.production-deploy-page.label.6-UtA0RB", id: "release-commands.production-deploy-page.label.6" })} id="release-commands.production-deploy-page.label" className="block text-sm font-medium" htmlFor="production-deploy-target">هدف Deploy Push</label>
            <select {...uiAttributes({ uid: "release-commands.production-deploy-page.select-E9fknV", id: "release-commands.production-deploy-page.select" })} id="production-deploy-target" value={target} onChange={(event) => setTarget(event.target.value as PushTarget)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" aria-label="هدف Deploy Push">{PUSH_TARGETS.map(([value, label]) => <option key={value} {...uiAttributes({ uid: "release-commands.production-deploy-page.option-cI47A0", id: "release-commands.production-deploy-page.option" })} value={value}>{label}</option>)}</select>
          </>
        ) : (
          <DeployAllOptions
            resumeMode={resumeMode}
            setResumeMode={setResumeMode}
            branchId={branchId}
            setBranchId={setBranchId}
            serviceSmokeRebuild={serviceSmokeRebuild}
            setServiceSmokeRebuild={setServiceSmokeRebuild}
          />
        )}
        <label {...uiAttributes({ uid: "release-commands.production-deploy-page.label.7-XZA0cq", id: "release-commands.production-deploy-page.label.7" })} id="release-commands.production-deploy-page.label.2" className="block text-sm font-medium" htmlFor="production-deploy-confirmation">
          اكتب عبارة التأكيد
        </label>
        <ConfirmationPhrase onApply={setConfirmation} />
        <Input ui={{ uid: "production-deploy.confirmation-G1gYy2", id: "production-deploy.confirmation", kind: "field", part: "execution" }}
          id="production-deploy-confirmation"
          value={confirmation}
          dir="ltr"
          autoComplete="off"
          aria-label="عبارة تأكيد النشر"
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <Button id="release-commands.production-deploy-page.button.3" ui={{ uid: "production-deploy.start-5p1eeC", id: "production-deploy.start", kind: "action", action: "start-production-deploy", part: "execution" }}
          type="button"
          disabled={!armed}
          aria-label="بدء النشر إلى الإنتاج"
          className="w-full active:scale-[0.99] focus-visible:ring-2"
          onClick={() => {
            setConfirmation("");
            void start(tab, target, tab === "deploy:all" ? deployAllOptions : undefined);
          }}
        >
          {starting || running ? (
            <Loader2 id="release-commands.production-deploy-page.loader2" className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Rocket id="release-commands.production-deploy-page.rocket.2" className="h-4 w-4" aria-hidden />
          )}
          {running ? "جارٍ النشر…" : tab === "deploy:all" ? "Deploy All" : "Deploy Push"}
        </Button>
        {error ? <p {...uiAttributes({ uid: "release-commands.production-deploy-page.p.7-91Gj37", id: "release-commands.production-deploy-page.p.7" })} id="release-commands.production-deploy-page.p.3" className="text-sm text-destructive">{errorText(error)}</p> : null}
      </section>

      <section {...uiAttributes({ uid: "release-commands.production-deploy-page.section.7-pM198h", id: "release-commands.production-deploy-page.section.7" })} id="release-commands.production-deploy-page.section.3" className="space-y-2 rounded-lg border p-3">
        <h2 {...uiAttributes({ uid: "release-commands.production-deploy-page.h2.3-TO2mZt", id: "release-commands.production-deploy-page.h2.3" })} id="release-commands.production-deploy-page.h2" className="flex items-center gap-2 text-sm font-semibold">
          <RefreshCw id="release-commands.production-deploy-page.refresh-cw" className="h-4 w-4" aria-hidden />
          الحالة
        </h2>
        <dl className="grid grid-cols-1 gap-x-2 gap-y-1 text-sm sm:grid-cols-2">
          <dt className="text-muted-foreground">الحالة</dt>
          <dd>{snapshot?.status ?? "…"}</dd>
          <dt className="text-muted-foreground">المرحلة</dt>
          <dd>{snapshot ? productionDeployStageLabel(snapshot.stage) : "…"}</dd>
          <dt className="text-muted-foreground">المعرّف</dt>
          <dd dir="ltr" className="break-all">{snapshot?.requestId ?? "—"}</dd>
          <dt className="text-muted-foreground">البريد</dt>
          <dd>{snapshot?.emailStatus ?? "—"}</dd>
          <dt className="text-muted-foreground">الأمر</dt>
          <dd dir="ltr">{snapshot?.command ?? "—"}</dd>
          <dt className="text-muted-foreground">وضع Deploy All</dt>
          <dd>{snapshot?.deployAllOptions ? deployAllModeLabel(snapshot.deployAllOptions) : "—"}</dd>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Timer id="release-commands.production-deploy-page.timer" className="h-3.5 w-3.5" aria-hidden />
            المدة
          </dt>
          <dd dir="ltr" className="font-mono tabular-nums">
            {totalElapsed === null ? "—" : formatDeployDuration(totalElapsed)}
          </dd>
        </dl>
        <ol {...uiAttributes({ uid: "release-commands.production-deploy-page.ol.2-6ODVfF", id: "release-commands.production-deploy-page.ol.2" })} id="release-commands.production-deploy-page.ol" className="space-y-1 text-sm">
          {TIMELINE.map((stage, index) => {
            const timing = timings.get(stage);
            return (
              <li
                key={stage} {...uiAttributes({ uid: "release-commands.production-deploy-page.li.2-FRBQ0r", id: "release-commands.production-deploy-page.li.2" })}
                className={
                  "flex items-baseline justify-between gap-2 " +
                  (currentIndex > index
                    ? "text-muted-foreground"
                    : currentIndex === index
                      ? "font-semibold"
                      : "opacity-60")
                }
              >
                <span {...uiAttributes({ uid: "release-commands.production-deploy-page.span.2-9jwKX1", id: "release-commands.production-deploy-page.span.2" })}>
                  {currentIndex > index ? "✓ " : currentIndex === index ? "• " : "○ "}
                  {productionDeployStageLabel(stage)}
                </span>
                <span {...uiAttributes({ uid: "release-commands.production-deploy-page.span.3-g8xQc1", id: "release-commands.production-deploy-page.span.3" })} dir="ltr" className="font-mono text-xs tabular-nums">
                  {timing ? formatDeployDuration(timing.elapsedMs) : ""}
                </span>
              </li>
            );
          })}
        </ol>
        {snapshot?.status === "failed" && snapshot.error ? (
          <p {...uiAttributes({ uid: "release-commands.production-deploy-page.p.8-tcz8zA", id: "release-commands.production-deploy-page.p.8" })} id="release-commands.production-deploy-page.p.4" className="rounded border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
            {snapshot.error}
          </p>
        ) : null}
      </section>

      <section {...uiAttributes({ uid: "release-commands.production-deploy-page.section.8-gAwIC9", id: "release-commands.production-deploy-page.section.8" })} id="release-commands.production-deploy-page.section.4" className="min-w-0 space-y-2 rounded-lg border p-3">
        <h2 {...uiAttributes({ uid: "release-commands.production-deploy-page.h2.4-bH9LNl", id: "release-commands.production-deploy-page.h2.4" })} id="release-commands.production-deploy-page.h2.2" className="text-sm font-semibold">السجل</h2>
        {/* overflow-x-auto + overflow-y-auto: scroll in both directions. */}
        {/* whitespace-pre: preserves log formatting without forcing line-wrap. */}
        {/* min-w-0: prevents the pre from escaping its flex/grid container. */}
        <div {...uiAttributes({ uid: "release-commands.production-deploy-page.div.6-O270Da", id: "release-commands.production-deploy-page.div.6" })} id="release-commands.production-deploy-page.div.2" className="min-w-0 overflow-x-auto">
          <pre
            ref={logRef}
            dir="ltr"
            className="max-h-80 min-w-0 overflow-y-auto whitespace-pre rounded bg-muted p-2 text-xs leading-5"
          >
            {result?.logTail || "لا يوجد سجل بعد."}
          </pre>
        </div>
      </section>
    </main>
  );
}

type PushTarget = "all" | "main" | "notifications" | "products" | "orders" | "profiles" | "submain" | "sub2main";
const PUSH_TARGETS: readonly [PushTarget, string][] = [["all", "كل الأهداف"], ["main", "التطبيق الرئيسي"], ["notifications", "الإشعارات"], ["products", "المنتجات"], ["orders", "الطلبات"], ["profiles", "الملفات الشخصية"], ["submain", "Submain"], ["sub2main", "Sub2main"]];
const DEPLOY_ALL_BRANCH_IDS = deployAllBranchIds();
const DEPLOY_ALL_RESUME_MODES: readonly [RemoteDeployAllResumeMode, string][] = [
  ["full", "تشغيل كامل"],
  ["from-branch", "استكمال من فرع"],
  ["rerun-branch", "إعادة فرع واحد"],
  ["rerun-failed", "استكمال من أول فشل محفوظ"],
];

function deployAllModeLabel(options: RemoteDeployAllOptions): string {
  const mode = DEPLOY_ALL_RESUME_MODES.find(([value]) => value === (options.resumeMode ?? "full"))?.[1] ?? "تشغيل كامل";
  const branch = options.branchId ? ` (${options.branchId})` : "";
  const rebuild = options.serviceSmokeRebuild ? " + rebuild smoke" : "";
  return `${mode}${branch}${rebuild}`;
}

function DeployAllOptions(props: {
  resumeMode: RemoteDeployAllResumeMode;
  setResumeMode: (value: RemoteDeployAllResumeMode) => void;
  branchId: string;
  setBranchId: (value: string) => void;
  serviceSmokeRebuild: boolean;
  setServiceSmokeRebuild: (value: boolean) => void;
}) {
  const needsBranch = props.resumeMode === "from-branch" || props.resumeMode === "rerun-branch";
  return (
    <div {...uiAttributes({ uid: "release-commands.production-deploy-page.div.7-gXA6Up", id: "release-commands.production-deploy-page.div.7" })} id="release-commands.production-deploy-page.div.3" className="space-y-3">
      <label {...uiAttributes({ uid: "release-commands.production-deploy-page.label.8-Qr94KC", id: "release-commands.production-deploy-page.label.8" })} id="release-commands.production-deploy-page.label.3" className="block text-sm font-medium" htmlFor="production-deploy-resume-mode">وضع Deploy All</label>
      <select {...uiAttributes({ uid: "release-commands.production-deploy-page.select.2-xtY20E", id: "release-commands.production-deploy-page.select.2" })}
        id="production-deploy-resume-mode"
        value={props.resumeMode}
        onChange={(event) => props.setResumeMode(event.target.value as RemoteDeployAllResumeMode)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        aria-label="وضع Deploy All"
      >
        {DEPLOY_ALL_RESUME_MODES.map(([value, label]) => <option key={value} {...uiAttributes({ uid: "release-commands.production-deploy-page.option.2-hDqF18", id: "release-commands.production-deploy-page.option.2" })} value={value}>{label}</option>)}
      </select>
      {needsBranch ? (
        <>
          <label {...uiAttributes({ uid: "release-commands.production-deploy-page.label.9-XF3afY", id: "release-commands.production-deploy-page.label.9" })} id="release-commands.production-deploy-page.label.4" className="block text-sm font-medium" htmlFor="production-deploy-branch">فرع runbook</label>
          <select {...uiAttributes({ uid: "release-commands.production-deploy-page.select.3-IJERa8", id: "release-commands.production-deploy-page.select.3" })}
            id="production-deploy-branch"
            value={props.branchId}
            onChange={(event) => props.setBranchId(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            aria-label="فرع runbook"
            dir="ltr"
          >
            {DEPLOY_ALL_BRANCH_IDS.map((id) => <option key={id} {...uiAttributes({ uid: "release-commands.production-deploy-page.option.3-kR2XVR", id: "release-commands.production-deploy-page.option.3" })} value={id}>{id}</option>)}
          </select>
        </>
      ) : null}
      <label {...uiAttributes({ uid: "release-commands.production-deploy-page.label.10-n811WZ", id: "release-commands.production-deploy-page.label.10" })} id="release-commands.production-deploy-page.label.5" className="flex items-center gap-2 text-sm">
        <input {...uiAttributes({ uid: "release-commands.production-deploy-page.input.2-92NDTR", id: "release-commands.production-deploy-page.input.2" })} id="release-commands.production-deploy-page.input"
          type="checkbox"
          checked={props.serviceSmokeRebuild}
          onChange={(event) => props.setServiceSmokeRebuild(event.target.checked)}
          className="h-5 w-5 rounded border active:scale-95 focus-visible:ring-2"
          aria-label="إجبار smoke services على إعادة البناء"
        />
        <span {...uiAttributes({ uid: "release-commands.production-deploy-page.span.4-WK6mv8", id: "release-commands.production-deploy-page.span.4" })} id="release-commands.production-deploy-page.span">إجبار smoke:services على إعادة البناء</span>
      </label>
    </div>
  );
}

/**
 * The confirmation phrase, selectable and copyable.
 *
 * Typing it by hand on a phone is what the deliberate friction is for, not a
 * transcription error: tapping the phrase fills the field and copies it, and
 * the text itself stays selectable for a manual copy.
 */
function ConfirmationPhrase(props: { onApply: (value: string) => void }) {
  const [copied, setCopied] = React.useState(false);

  const apply = () => {
    props.onApply(REMOTE_DEPLOY_ALL_CONFIRMATION);
    void NativeCore.writeClipboard({ string: REMOTE_DEPLOY_ALL_CONFIRMATION }).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    });
  };

  return (
    <div {...uiAttributes({ uid: "release-commands.production-deploy-page.div.8-mHVk7K", id: "release-commands.production-deploy-page.div.8" })} id="release-commands.production-deploy-page.div.4" className="flex flex-wrap items-center justify-between gap-2">
      <code className="select-all rounded bg-muted px-2 py-1 font-mono text-sm" dir="ltr">
        {REMOTE_DEPLOY_ALL_CONFIRMATION}
      </code>
      <Button id="release-commands.production-deploy-page.button.4" ui={{ uid: "production-deploy.copy-phrase-e0wHqS", id: "production-deploy.copy-phrase", kind: "action", action: "copy-confirmation-phrase", part: "execution" }}
        type="button"
        variant="outline"
        size="sm"
        aria-label="نسخ عبارة التأكيد"
        className="h-8 shrink-0 px-2 active:scale-[0.98]"
        onClick={apply}
      >
        <Clipboard id="release-commands.production-deploy-page.clipboard" className="h-3.5 w-3.5" aria-hidden />
        {copied ? "تم النسخ" : "نسخ العبارة"}
      </Button>
    </div>
  );
}

/**
 * A clock that only ticks while something is running.
 *
 * The durations themselves come from the sandbox's timestamps; this exists so
 * the running one advances between polls instead of jumping every five seconds.
 */
function useTickingClock(active: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [active]);

  return now;
}
