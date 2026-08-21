"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useBuildJobs } from "@/modules/release-commands/hooks/use-build-jobs";
import { DEPLOY_ALL_RUNBOOK, DEPLOY_PUSH_RUNBOOK, deployAllBranchIds, deployPushBranchIds } from "@asol/release-core/console";
import { useAuthHeaders } from "../hooks/use-auth-headers";
import { RunbookPanel, Option } from "./DeployRunbookControls";
import { ExecutionBox } from "./DeployRunbookExecutionBox";
import { ExecutionIndicator, Terminal } from "./DeployRunbookTerminal";
import type { DeployTab } from "./DeployRunbookTypes";
import { ALL_BRANCH_HELP, PUSH_BRANCH_HELP, deployAllScenarioArg, deployAllScenarios, deployPushTargets } from "./deploy-runbook-copy";

export function DeployRunbookPage() {
  const { session, isLoading } = useSession();
  const allowed = !isLoading && isSuperAdmin(session);
  const jobs = useBuildJobs(useAuthHeaders());
  const [tab, setTab] = React.useState<DeployTab>("deploy-all");
  const [allSelected, setAllSelected] = React.useState(() => new Set(deployAllBranchIds()));
  const [pushSelected, setPushSelected] = React.useState(() => new Set(deployPushBranchIds()));
  const [allScenario, setAllScenario] = React.useState("full");
  const [pushTarget, setPushTarget] = React.useState("all");
  const [continueOnError, setContinueOnError] = React.useState(false);
  const [skipPreflight, setSkipPreflight] = React.useState(false);
  const [allowEmpty, setAllowEmpty] = React.useState(false);
  const [allowManifestDowngrade, setAllowManifestDowngrade] = React.useState(false);
  const [allowScratchFiles, setAllowScratchFiles] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");

  if (isLoading) return <main className="p-4 text-sm text-on-surface-variant">جار التحميل...</main>;
  if (!allowed) return <main className="mx-auto max-w-2xl p-6"><div className="rounded-md bg-error-container p-4 text-on-error-container">هذه الصفحة متاحة للسوبر أدمن فقط.</div></main>;

  const activeJob = jobs.jobs.find((job) => job.status === "queued" || job.status === "running");
  const locked = jobs.busy || Boolean(activeJob);
  const exactPhrase = tab === "deploy-all" ? "DEPLOY_ALL" : "DEPLOY_PUSH";
  const selectedCount = tab === "deploy-all" ? allSelected.size : pushSelected.size;
  const totalCount = tab === "deploy-all" ? deployAllBranchIds().length : deployPushBranchIds().length;
  const commandPreview = tab === "deploy-all"
    ? deployAllPreview(allScenario, allSelected, { continueOnError, skipPreflight, allowEmpty, allowManifestDowngrade, allowScratchFiles })
    : deployPushPreview(pushTarget, { allowEmpty, allowManifestDowngrade, allowScratchFiles });

  const start = () => void jobs.start(tab === "deploy-all" ? {
    commandId: "deploy-all-runbook", confirmationPhrase: exactPhrase,
    parameters: { deployAllScenario: allScenario, deployAllBranches: [...allSelected].join(","), deployAllContinueOnError: continueOnError, deployAllSkipPreflight: skipPreflight, deployAllAllowEmpty: allowEmpty, deployAllAllowManifestDowngrade: allowManifestDowngrade, deployAllAllowScratchFiles: allowScratchFiles },
  } : {
    commandId: "deploy-push-runbook", confirmationPhrase: exactPhrase,
    parameters: { deployPushTarget: pushTarget, deployPushAllowEmpty: allowEmpty, deployPushAllowManifestDowngrade: allowManifestDowngrade, deployPushAllowScratchFiles: allowScratchFiles },
  });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 pb-24" dir="rtl">
      <Header />
      <TabButtons tab={tab} setTab={setTab} />
      <Summary selectedCount={selectedCount} totalCount={totalCount} status={activeJob?.status ?? "جاهز"} continueOnError={continueOnError && tab === "deploy-all"} />
      {tab === "deploy-all" ? <DeployAllPanel selected={allSelected} setSelected={setAllSelected} scenario={allScenario} setScenario={setAllScenario} continueOnError={continueOnError} setContinueOnError={setContinueOnError} skipPreflight={skipPreflight} setSkipPreflight={setSkipPreflight} /> : <RunbookPanel title="Deploy Push" description="المسار السريع: أسرار، commit، push، ثم تحقق Vercel للأهداف المختارة دون فحوصات build/test." runbook={DEPLOY_PUSH_RUNBOOK} help={PUSH_BRANCH_HELP} selected={pushSelected} setSelected={setPushSelected} scenarioLabel="هدف Vercel" scenarioValue={pushTarget} onScenarioChange={setPushTarget} scenarios={deployPushTargets} />}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3"><ExecutionIndicator log={jobs.log} tab={tab} status={activeJob?.status ?? "idle"} /><Terminal text={jobs.log} onCopy={() => void navigator.clipboard.writeText(jobs.log)} onClear={jobs.clearLog} /></div>
        <ExecutionBox locked={locked} activeJob={activeJob} exactPhrase={exactPhrase} confirmation={confirmation} setConfirmation={setConfirmation} commandPreview={commandPreview} allowEmpty={allowEmpty} setAllowEmpty={setAllowEmpty} allowManifestDowngrade={allowManifestDowngrade} setAllowManifestDowngrade={setAllowManifestDowngrade} allowScratchFiles={allowScratchFiles} setAllowScratchFiles={setAllowScratchFiles} startError={jobs.startError} onStart={start} onCancel={() => activeJob && void jobs.cancel(activeJob)} />
      </section>
    </main>
  );
}

function Header() {
  return <header className="space-y-2"><h1 className="text-2xl font-semibold">مركز تشغيل Deploy</h1><p className="text-sm text-on-surface-variant">تنفيذ الأوامر يتم كعملية نظام مستقلة من خلال Job محلي، والصفحة تعرض الطرفية وتتحكم في التسلسل فقط.</p></header>;
}

function TabButtons(props: { tab: DeployTab; setTab: (tab: DeployTab) => void }) {
  return <div className="flex flex-wrap gap-2"><Button variant={props.tab === "deploy-all" ? "default" : "outline"} onClick={() => props.setTab("deploy-all")}>Deploy All</Button><Button variant={props.tab === "deploy-push" ? "default" : "outline"} onClick={() => props.setTab("deploy-push")}>Deploy Push</Button></div>;
}

function Summary(props: { selectedCount: number; totalCount: number; status: string; continueOnError: boolean }) {
  return <section className="grid gap-3 md:grid-cols-3"><InfoCard title="الفروع المفعّلة" value={`${props.selectedCount} / ${props.totalCount}`} help="كل checkbox يحدد هل يدخل هذا الفرع ضمن خطة التشغيل الحالية أم يتم تجاوزه." /><InfoCard title="حالة التنفيذ" value={props.status} help="العملية تستمر كـ job محلي حتى لو أغلقت الصفحة." /><InfoCard title="سلوك الخطأ" value={props.continueOnError ? "استمرار" : "توقف"} help="الافتراضي يوقف التسلسل عند أول خطأ لحماية النشر من نتائج نصف مكتملة." /></section>;
}

function DeployAllPanel(props: { selected: Set<string>; setSelected: (next: Set<string>) => void; scenario: string; setScenario: (value: string) => void; continueOnError: boolean; setContinueOnError: (value: boolean) => void; skipPreflight: boolean; setSkipPreflight: (value: boolean) => void }) {
  return <RunbookPanel title="Deploy All" description="المسار الكامل: فحوصات، بناء، قواعد بيانات، خدمات، GitHub، ثم تحقق Vercel." runbook={DEPLOY_ALL_RUNBOOK} help={ALL_BRANCH_HELP} selected={props.selected} setSelected={props.setSelected} scenarioLabel="وضع التشغيل" scenarioValue={props.scenario} onScenarioChange={props.setScenario} scenarios={deployAllScenarios} extraOptions={<><Option checked={props.continueOnError} onChange={props.setContinueOnError} label="الاستمرار بعد الخطأ" help="عند التفعيل يحاول الانتقال للمرحلة التالية بعد تسجيل الخطأ. الافتراضي أكثر أماناً: التوقف عند أول فشل." /><Option checked={props.skipPreflight} onChange={props.setSkipPreflight} label="تجاوز preflight" help="يسمح بتشغيل publish دون انتظار الفحوصات الطويلة. يظهر هذا في commit حتى لا يختفي الاختصار." /></>} />;
}

function InfoCard(props: { title: string; value: string; help: string }) {
  return <div className="rounded-md border bg-surface p-3"><div className="text-xs text-on-surface-variant">{props.title}</div><div className="mt-1 text-lg font-semibold">{props.value}</div><p className="mt-1 text-xs text-on-surface-variant">{props.help}</p></div>;
}

function deployAllPreview(scenario: string, selected: Set<string>, flags: { continueOnError: boolean; skipPreflight: boolean; allowEmpty: boolean; allowManifestDowngrade: boolean; allowScratchFiles: boolean }) {
  return `npm run deploy:all -- ${deployAllScenarioArg(scenario)} --runbook-branches=${[...selected].join(",")}${flags.continueOnError ? " --continue-on-error" : ""}${flags.skipPreflight ? " --skip-preflight" : ""}${flags.allowEmpty ? " --allow-empty" : ""}${flags.allowManifestDowngrade ? " --allow-manifest-downgrade" : ""}${flags.allowScratchFiles ? " --allow-scratch-files" : ""}`.replace(/\s+/g, " ").trim();
}

function deployPushPreview(target: string, flags: { allowEmpty: boolean; allowManifestDowngrade: boolean; allowScratchFiles: boolean }) {
  return `npm run deploy:push -- --vercel-target=${target}${flags.allowEmpty ? " --allow-empty" : ""}${flags.allowManifestDowngrade ? " --allow-manifest-downgrade" : ""}${flags.allowScratchFiles ? " --allow-scratch-files" : ""}`;
}
