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
    <main id='features-release-commands-presentation-productiondeploypage-main-1-7fhqac' dir="rtl" className="mx-auto w-full max-w-3xl min-w-0 space-y-4 p-4 pb-24">
      <header id='features-release-commands-presentation-productiondeploypage-header-2-ypetim' className="space-y-1">
        <h1 id='features-release-commands-presentation-productiondeploypage-heading-3-cr9m3t' className="flex items-center gap-2 text-xl font-bold">
          <Rocket id='features-release-commands-presentation-productiondeploypage-rocket-4-72c3xt' className="h-5 w-5" aria-hidden />
          النشر إلى الإنتاج
        </h1>
        <p id='features-release-commands-presentation-productiondeploypage-text-5-jclace' className="text-sm text-muted-foreground">
          يشغّل هذا الإجراء <code id="features-release-commands-presentation-productiondeploypage-code-6-umudd5">deploy:all</code> كاملًا داخل بيئة نشر معزولة، ولا تمر أي أسرار
          عبر المتصفح.
        </p>
      </header>

      <div id='features-release-commands-presentation-productiondeploypage-div-7-infgtv' className="grid grid-cols-2 gap-2" role="tablist" aria-label="نوع النشر">
        <Button id='features-release-commands-presentation-productiondeploypage-button-8-gpnou6' type="button" role="tab" aria-selected={tab === "deploy:all"} variant={tab === "deploy:all" ? "default" : "outline"} onClick={() => setTab("deploy:all")}>Deploy All</Button>
        <Button id='features-release-commands-presentation-productiondeploypage-button-9-uj2rcz' type="button" role="tab" aria-selected={tab === "deploy:push"} variant={tab === "deploy:push" ? "default" : "outline"} onClick={() => setTab("deploy:push")}>Deploy Push</Button>
      </div>

      {readiness && !readiness.ready ? (
        <section id='features-release-commands-presentation-productiondeploypage-section-10-tbpwxi' className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p id='features-release-commands-presentation-productiondeploypage-text-11-xcyha1' className="flex items-center gap-2 font-semibold">
            <ShieldAlert id='features-release-commands-presentation-productiondeploypage-shieldalert-12-lnxwrm' className="h-4 w-4" aria-hidden />
            إعدادات ناقصة على الخادم
          </p>
          <ul id='features-release-commands-presentation-productiondeploypage-ul-13-zz8esk' className="mt-2 list-inside list-disc" dir="ltr">
            {readiness.missingConfiguration.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id='features-release-commands-presentation-productiondeploypage-section-14-pgrv3l' className="space-y-3 rounded-lg border p-3">
        {tab === "deploy:push" ? (
          <p id='features-release-commands-presentation-productiondeploypage-p-15-olxc1v' className="text-sm text-muted-foreground">
            ينشر المعاملة كاملة: control ثم الأحمال الستة ثم جاهزية الإصدار ثم gova. لا يوجد
            اختيار حساب جزئي.
          </p>
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
        <label id='features-release-commands-presentation-productiondeploypage-label-17-e6qpmm' className="block text-sm font-medium" htmlFor='features-release-commands-presentation-productiondeploypage-input-18-nqhv0g'>
          اكتب عبارة التأكيد
        </label>
        <ConfirmationPhrase onApply={setConfirmation} />
        <Input
          id='features-release-commands-presentation-productiondeploypage-input-18-nqhv0g'
          value={confirmation}
          dir="ltr"
          autoComplete="off"
          aria-label="عبارة تأكيد النشر"
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <Button id='features-release-commands-presentation-productiondeploypage-button-19-inm1wh'
          type="button"
          disabled={!armed}
          aria-label="بدء النشر إلى الإنتاج"
          className="w-full active:scale-[0.99] focus-visible:ring-2"
          onClick={() => {
            setConfirmation("");
            void start(tab, tab === "deploy:all" ? deployAllOptions : undefined);
          }}
        >
          {starting || running ? (
            <Loader2 id='features-release-commands-presentation-productiondeploypage-loader2-20-mwt8je' className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Rocket id='features-release-commands-presentation-productiondeploypage-rocket-21-sks0gf' className="h-4 w-4" aria-hidden />
          )}
          {running ? "جارٍ النشر…" : tab === "deploy:all" ? "Deploy All" : "Deploy Push"}
        </Button>
        {error ? <p id='features-release-commands-presentation-productiondeploypage-text-22-dfhzti' className="text-sm text-destructive">{errorText(error)}</p> : null}
      </section>

      <section id='features-release-commands-presentation-productiondeploypage-section-23-ll5y5r' className="space-y-2 rounded-lg border p-3">
        <h2 id='features-release-commands-presentation-productiondeploypage-heading-24-jtctmf' className="flex items-center gap-2 text-sm font-semibold">
          <RefreshCw id='features-release-commands-presentation-productiondeploypage-refreshcw-25-aabbey' className="h-4 w-4" aria-hidden />
          الحالة
        </h2>
        <dl id="features-release-commands-presentation-productiondeploypage-dl-26-mvefqa" className="grid grid-cols-1 gap-x-2 gap-y-1 text-sm sm:grid-cols-2">
          <dt id="features-release-commands-presentation-productiondeploypage-dt-27-l3uogc" className="text-muted-foreground">الحالة</dt>
          <dd id="features-release-commands-presentation-productiondeploypage-dd-28-lgowmz">{snapshot?.status ?? "…"}</dd>
          <dt id="features-release-commands-presentation-productiondeploypage-dt-29-ulsfnz" className="text-muted-foreground">المرحلة</dt>
          <dd id="features-release-commands-presentation-productiondeploypage-dd-30-j9zp3o">{snapshot ? productionDeployStageLabel(snapshot.stage) : "…"}</dd>
          <dt id="features-release-commands-presentation-productiondeploypage-dt-31-jidc4p" className="text-muted-foreground">المعرّف</dt>
          <dd id="features-release-commands-presentation-productiondeploypage-dd-32-pm9yka" dir="ltr" className="break-all">{snapshot?.requestId ?? "—"}</dd>
          <dt id="features-release-commands-presentation-productiondeploypage-dt-33-9t75dl" className="text-muted-foreground">البريد</dt>
          <dd id="features-release-commands-presentation-productiondeploypage-dd-34-e3xkrn">{snapshot?.emailStatus ?? "—"}</dd>
          <dt id="features-release-commands-presentation-productiondeploypage-dt-35-9j5khn" className="text-muted-foreground">الأمر</dt>
          <dd id="features-release-commands-presentation-productiondeploypage-dd-36-l6ebuz" dir="ltr">{snapshot?.command ?? "—"}</dd>
          <dt id="features-release-commands-presentation-productiondeploypage-dt-37-ts8mh8" className="text-muted-foreground">وضع Deploy All</dt>
          <dd id="features-release-commands-presentation-productiondeploypage-dd-38-c38hpg">{snapshot?.deployAllOptions ? deployAllModeLabel(snapshot.deployAllOptions) : "—"}</dd>
          <dt id="features-release-commands-presentation-productiondeploypage-dt-39-dme2he" className="flex items-center gap-1 text-muted-foreground">
            <Timer id='features-release-commands-presentation-productiondeploypage-timer-40-z6vzv3' className="h-3.5 w-3.5" aria-hidden />
            المدة
          </dt>
          <dd id="features-release-commands-presentation-productiondeploypage-dd-41-up7pdx" dir="ltr" className="font-mono tabular-nums">
            {totalElapsed === null ? "—" : formatDeployDuration(totalElapsed)}
          </dd>
        </dl>
        <ol id='features-release-commands-presentation-productiondeploypage-ol-42-nsklzi' className="space-y-1 text-sm">
          {TIMELINE.map((stage, index) => {
            const timing = timings.get(stage);
            return (
              <li
                key={stage}
                className={
                  "flex items-baseline justify-between gap-2 " +
                  (currentIndex > index
                    ? "text-muted-foreground"
                    : currentIndex === index
                      ? "font-semibold"
                      : "opacity-60")
                }
              >
                <span>
                  {currentIndex > index ? "✓ " : currentIndex === index ? "• " : "○ "}
                  {productionDeployStageLabel(stage)}
                </span>
                <span dir="ltr" className="font-mono text-xs tabular-nums">
                  {timing ? formatDeployDuration(timing.elapsedMs) : ""}
                </span>
              </li>
            );
          })}
        </ol>
        {snapshot?.status === "failed" && snapshot.error ? (
          <p id='features-release-commands-presentation-productiondeploypage-text-43-4w0yew' className="rounded border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
            {snapshot.error}
          </p>
        ) : null}
      </section>

      <section id='features-release-commands-presentation-productiondeploypage-section-44-rnpbu4' className="min-w-0 space-y-2 rounded-lg border p-3">
        <h2 id='features-release-commands-presentation-productiondeploypage-heading-45-ktcfl1' className="text-sm font-semibold">السجل</h2>
        {/* overflow-x-auto + overflow-y-auto: scroll in both directions. */}
        {/* whitespace-pre: preserves log formatting without forcing line-wrap. */}
        {/* min-w-0: prevents the pre from escaping its flex/grid container. */}
        <div id='features-release-commands-presentation-productiondeploypage-div-46-xaetrb' className="min-w-0 overflow-x-auto">
          <pre id="features-release-commands-presentation-productiondeploypage-pre-47-2rbrnl"
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
    <div id='features-release-commands-presentation-productiondeploypage-div-48-qyc4bk' className="space-y-3">
      <label id='features-release-commands-presentation-productiondeploypage-label-49-s6arp6' className="block text-sm font-medium" htmlFor='features-release-commands-presentation-productiondeploypage-select-50-laehef'>وضع Deploy All</label>
      <select
        id='features-release-commands-presentation-productiondeploypage-select-50-laehef'
        value={props.resumeMode}
        onChange={(event) => props.setResumeMode(event.target.value as RemoteDeployAllResumeMode)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        aria-label="وضع Deploy All"
      >
        {DEPLOY_ALL_RESUME_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {needsBranch ? (
        <>
          <label id='features-release-commands-presentation-productiondeploypage-label-51-l2xpap' className="block text-sm font-medium" htmlFor="production-deploy-branch">فرع runbook</label>
          <select
            id="production-deploy-branch"
            value={props.branchId}
            onChange={(event) => props.setBranchId(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            aria-label="فرع runbook"
            dir="ltr"
          >
            {DEPLOY_ALL_BRANCH_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </>
      ) : null}
      <label id='features-release-commands-presentation-productiondeploypage-label-53-xyllbe' className="flex items-center gap-2 text-sm">
        <input id='features-release-commands-presentation-productiondeploypage-input-54-l8fk81'
          type="checkbox"
          checked={props.serviceSmokeRebuild}
          onChange={(event) => props.setServiceSmokeRebuild(event.target.checked)}
          className="h-5 w-5 rounded border active:scale-95 focus-visible:ring-2"
          aria-label="إجبار smoke services على إعادة البناء"
        />
        <span id='features-release-commands-presentation-productiondeploypage-text-55-etplka'>إجبار smoke:services على إعادة البناء</span>
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
    <div id='features-release-commands-presentation-productiondeploypage-div-56-qvsu5b' className="flex flex-wrap items-center justify-between gap-2">
      <code id="features-release-commands-presentation-productiondeploypage-code-57-dnjexe" className="select-all rounded bg-muted px-2 py-1 font-mono text-sm" dir="ltr">
        {REMOTE_DEPLOY_ALL_CONFIRMATION}
      </code>
      <Button id='features-release-commands-presentation-productiondeploypage-button-58-pt3c6z'
        type="button"
        variant="outline"
        size="sm"
        aria-label="نسخ عبارة التأكيد"
        className="h-8 shrink-0 px-2 active:scale-[0.98]"
        onClick={apply}
      >
        <Clipboard id='features-release-commands-presentation-productiondeploypage-clipboard-59-r3yxrl' className="h-3.5 w-3.5" aria-hidden />
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
