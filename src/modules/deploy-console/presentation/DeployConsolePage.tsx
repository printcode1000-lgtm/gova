"use client";

import * as React from "react";

import { PageSnapshotPage } from "@/features/page-snapshot";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEPLOY_CONSOLE_API } from "../config";
import {
  buildDeployAllCommands,
  buildDeployPushCommands,
} from "../domain/build-commands";
import {
  DEPLOY_ALL_FLAG_OPTIONS,
  DEPLOY_ALL_PHASE_OPTIONS,
  DEPLOY_ALL_PHASE_ORDER,
  DEPLOY_PUSH_ALWAYS_STEPS,
  DEPLOY_PUSH_FLAG_OPTIONS,
  DEPLOY_PUSH_TARGET_OPTIONS,
  ISOLATED_DEPLOY_TARGETS,
  type DeployAllFlagId,
  type DeployAllPhaseId,
  type IsolatedDeployTarget,
} from "../domain/catalog";

type TabId = "deploy-all" | "deploy-push";
type RunStatus = "running" | "succeeded" | "failed" | null;

function MixedRtlDescription({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|--[\w-]+|\b[A-Za-z][\w./:@+-]*\b)/g);
  return (
    <span
      dir="rtl"
      className="mt-1 block text-right text-xs leading-5 text-on-surface-variant"
      style={{ unicodeBidi: "isolate" }}
    >
      {parts.map((part, index) => {
        if (!part) return null;
        if (/^(`[^`]+`|--[\w-]+|[A-Za-z])/.test(part)) {
          return (
            <span
              key={`${index}-${part}`}
              dir="ltr"
              className="mx-0.5 inline-block font-mono"
              style={{ unicodeBidi: "isolate" }}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>;
      })}
    </span>
  );
}

function OptionRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      dir="rtl"
      className={`flex items-start gap-3 rounded-md border border-outline-variant/40 p-3 text-right ${
        disabled ? "opacity-60" : "active:bg-surface-container-high"
      }`}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-1 shrink-0"
      />
      <span className="min-w-0 flex-1 text-right" dir="rtl">
        <span
          dir="ltr"
          className="block text-right font-mono text-sm font-semibold text-on-surface"
          style={{ unicodeBidi: "isolate" }}
        >
          {label}
        </span>
        <MixedRtlDescription text={description} />
      </span>
    </label>
  );
}

function statusLabel(status: RunStatus): string {
  if (status === "running") return "جاري التنفيذ…";
  if (status === "succeeded") return "اكتمل بنجاح";
  if (status === "failed") return "فشل التنفيذ";
  return "لا يوجد تشغيل حالي";
}

export function DeployConsolePage() {
  const [tab, setTab] = React.useState<TabId>("deploy-all");
  const [phases, setPhases] = React.useState<Set<DeployAllPhaseId>>(
    () => new Set(DEPLOY_ALL_PHASE_ORDER),
  );
  const [flags, setFlags] = React.useState<Set<DeployAllFlagId>>(() => new Set());
  const [revision, setRevision] = React.useState("");
  const [targets, setTargets] = React.useState<Set<IsolatedDeployTarget>>(
    () => new Set(),
  );
  const [retryFailed, setRetryFailed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [logText, setLogText] = React.useState("");
  const [runStatus, setRunStatus] = React.useState<RunStatus>(null);
  const [runId, setRunId] = React.useState<string | null>(null);
  const [copyHint, setCopyHint] = React.useState<string | null>(null);
  const logEndRef = React.useRef<HTMLPreElement>(null);
  const logOffsetRef = React.useRef(0);
  const polling = runStatus === "running";

  const preview = React.useMemo(() => {
    try {
      if (tab === "deploy-all") {
        return buildDeployAllCommands({
          phases: [...phases],
          flags: [...flags],
          revision,
        });
      }
      return buildDeployPushCommands({
        targets: [...targets],
        retryFailed,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const arabic =
        code === "deployConsoleNoPhasesSelected"
          ? "اختر مرحلةً واحدةً على الأقل."
          : code === "deployConsoleInvalidRevision"
            ? "قيمة --revision غير صالحة (sha قصير أو كامل)."
            : "تعذر بناء الأمر.";
      return {
        engine: tab,
        commands: [] as string[],
        summaryLines: [arabic],
      };
    }
  }, [tab, phases, flags, revision, targets, retryFailed]);

  const togglePhase = (id: DeployAllPhaseId, next: boolean) => {
    setPhases((current) => {
      const copy = new Set(current);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const toggleFlag = (id: DeployAllFlagId, next: boolean) => {
    setFlags((current) => {
      const copy = new Set(current);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const toggleTarget = (id: IsolatedDeployTarget, next: boolean) => {
    setTargets((current) => {
      const copy = new Set(current);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const pollLog = React.useCallback(async (reset = false) => {
    const offset = reset ? 0 : logOffsetRef.current;
    const response = await fetch(`${DEPLOY_CONSOLE_API}?offset=${offset}`);
    const data = (await response.json()) as {
      text?: string;
      nextOffset?: number;
      run?: { status?: RunStatus; runId?: string } | null;
    };
    if (!response.ok) return;
    if (reset) {
      setLogText(data.text ?? "");
    } else if (typeof data.text === "string" && data.text.length > 0) {
      setLogText((current) => current + data.text);
    }
    if (typeof data.nextOffset === "number") {
      logOffsetRef.current = data.nextOffset;
    }
    if (data.run?.status) setRunStatus(data.run.status);
    if (data.run?.runId) setRunId(data.run.runId);
  }, []);

  React.useEffect(() => {
    void pollLog(true);
  }, [pollLog]);

  React.useEffect(() => {
    if (!polling) return;
    const timer = window.setInterval(() => {
      void pollLog(false);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [polling, pollLog]);

  React.useEffect(() => {
    logEndRef.current?.scrollTo({ top: logEndRef.current.scrollHeight });
  }, [logText]);

  const launch = async () => {
    if (preview.commands.length === 0) return;
    setBusy(true);
    setConfirmOpen(false);
    try {
      const body =
        tab === "deploy-all"
          ? {
              engine: "deploy-all" as const,
              phases: [...phases],
              flags: [...flags],
              revision: revision.trim() || undefined,
            }
          : {
              engine: "deploy-push" as const,
              targets: [...targets],
              retryFailed,
            };
      const response = await fetch(DEPLOY_CONSOLE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        runId?: string;
        status?: RunStatus;
      };
      if (!response.ok) {
        setLogText((current) =>
          `${current}\n[deploy-console] فشل الإطلاق: ${data.error ?? response.statusText}\n`,
        );
        return;
      }
      setLogText("");
      logOffsetRef.current = 0;
      setRunId(data.runId ?? null);
      setRunStatus(data.status ?? "running");
      await pollLog(true);
    } catch (error) {
      setLogText(
        `[deploy-console] خطأ شبكة/عميل: ${
          error instanceof Error ? error.message : String(error)
        }\n`,
      );
      setRunStatus("failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageSnapshotPage
      as="main"
      nestedScroll
      scrollId="dev-deploy-console-scroll"
      className="mx-auto w-full max-w-3xl space-y-4 p-4 pb-24"
      dir="rtl"
    >
      <header dir="rtl" className="text-right">
        <h1 className="text-2xl font-semibold text-on-surface">وحدة النشر</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          تشغيل Deploy All أو Deploy Push بعملية منفصلة عن سيرفر Next.js، مع عرض
          المخرجات مباشرة في الصفحة.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="deploy-all">Deploy All</TabsTrigger>
          <TabsTrigger value="deploy-push">Deploy Push</TabsTrigger>
        </TabsList>

        <TabsContent value="deploy-all" className="mt-4 space-y-4">
          <section className="space-y-2" dir="rtl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">المراحل</h2>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPhases(new Set(DEPLOY_ALL_PHASE_ORDER))}
                >
                  تحديد الكل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPhases(new Set())}
                >
                  إلغاء الكل
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {DEPLOY_ALL_PHASE_OPTIONS.map((option) => (
                <OptionRow
                  key={option.id}
                  id={`phase-${option.id}`}
                  label={option.label}
                  description={option.description}
                  checked={phases.has(option.id as DeployAllPhaseId)}
                  onCheckedChange={(next) =>
                    togglePhase(option.id as DeployAllPhaseId, next)
                  }
                />
              ))}
            </div>
          </section>

          <section className="space-y-2" dir="rtl">
            <h2 className="text-sm font-semibold">خيارات اختيارية</h2>
            <div className="space-y-2">
              {DEPLOY_ALL_FLAG_OPTIONS.map((option) => (
                <OptionRow
                  key={option.id}
                  id={`flag-${option.id}`}
                  label={option.label}
                  description={option.description}
                  checked={flags.has(option.id as DeployAllFlagId)}
                  onCheckedChange={(next) =>
                    toggleFlag(option.id as DeployAllFlagId, next)
                  }
                />
              ))}
            </div>
            <div
              className="space-y-1 rounded-md border border-outline-variant/40 p-3 text-right"
              dir="rtl"
            >
              <label htmlFor="revision" className="text-sm font-semibold">
                <span dir="ltr" className="inline-block font-mono" style={{ unicodeBidi: "isolate" }}>
                  --revision
                </span>{" "}
                (اختياري)
              </label>
              <p className="text-xs text-on-surface-variant">
                يتجاوز الـ{" "}
                <span dir="ltr" className="inline-block font-mono" style={{ unicodeBidi: "isolate" }}>
                  revision
                </span>{" "}
                المحفوظ عند إعادة محاولة مراحل النشر بعد إصلاح يدوي.
              </p>
              <Input
                id="revision"
                value={revision}
                onChange={(event) => setRevision(event.target.value)}
                placeholder="مثلاً a1b2c3d"
                className="mt-2 font-mono"
                dir="ltr"
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="deploy-push" className="mt-4 space-y-4">
          <section className="space-y-2" dir="rtl">
            <h2 className="text-sm font-semibold">خطوات إلزامية (دائمًا)</h2>
            <div className="space-y-2">
              {DEPLOY_PUSH_ALWAYS_STEPS.map((option) => (
                <OptionRow
                  key={option.id}
                  id={`always-${option.id}`}
                  label={option.label}
                  description={option.description}
                  checked
                  disabled
                  onCheckedChange={() => undefined}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2" dir="rtl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">أهداف معزولة</h2>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTargets(new Set(ISOLATED_DEPLOY_TARGETS))}
                >
                  تحديد الكل
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTargets(new Set())}
                >
                  main فقط
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {DEPLOY_PUSH_TARGET_OPTIONS.map((option) => (
                <OptionRow
                  key={option.id}
                  id={`target-${option.id}`}
                  label={option.label}
                  description={option.description}
                  checked={targets.has(option.id as IsolatedDeployTarget)}
                  onCheckedChange={(next) =>
                    toggleTarget(option.id as IsolatedDeployTarget, next)
                  }
                />
              ))}
            </div>
          </section>

          <section className="space-y-2" dir="rtl">
            <h2 className="text-sm font-semibold">خيارات</h2>
            <div className="space-y-2">
              {DEPLOY_PUSH_FLAG_OPTIONS.map((option) => (
                <OptionRow
                  key={option.id}
                  id={`push-flag-${option.id}`}
                  label={option.label}
                  description={option.description}
                  checked={retryFailed}
                  onCheckedChange={setRetryFailed}
                />
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <section className="space-y-2" dir="rtl">
        <h2 className="text-sm font-semibold">معاينة التنفيذ</h2>
        <pre
          className="max-h-40 overflow-auto rounded-md bg-surface-container p-3 text-left text-xs leading-5 text-on-surface"
          dir="ltr"
        >
          {[...preview.summaryLines, "", ...preview.commands].join("\n")}
        </pre>
        <Button
          type="button"
          disabled={busy || polling || preview.commands.length === 0}
          onClick={() => setConfirmOpen(true)}
          className="w-full active:opacity-90"
        >
          {busy || polling ? "جاري التنفيذ…" : "تشغيل وعرض المخرجات هنا"}
        </Button>
      </section>

      <section className="space-y-2" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">طرفية التنفيذ</h2>
          <span className="text-xs text-on-surface-variant">
            {statusLabel(runStatus)}
            {runId ? ` · ${runId}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!logText.trim()}
            onClick={() => {
              void navigator.clipboard.writeText(logText).then(
                () => setCopyHint("تم النسخ"),
                () => setCopyHint("تعذر النسخ"),
              );
              window.setTimeout(() => setCopyHint(null), 2000);
            }}
          >
            {copyHint ?? "نسخ المحتوى"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!logText && !runId}
            onClick={() => {
              setLogText("");
              setCopyHint(null);
            }}
          >
            مسح
          </Button>
        </div>
        <pre
          ref={logEndRef}
          className="max-h-80 min-h-48 overflow-auto rounded-md border border-outline-variant/40 bg-black p-3 text-left font-mono text-xs leading-5 text-green-400"
          dir="ltr"
        >
          {logText || "لا توجد مخرجات بعد. اضغط تشغيل لبدء التنفيذ."}
        </pre>
      </section>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deploy-confirm-title"
            className="w-full max-w-md space-y-3 rounded-lg bg-surface p-4 text-right shadow-lg"
            dir="rtl"
          >
            <h3 id="deploy-confirm-title" className="text-lg font-semibold">
              تأكيد النشر للإنتاج
            </h3>
            <p className="text-sm text-on-surface-variant">
              سيبدأ تشغيل أوامر تدفع إلى{" "}
              <span dir="ltr" className="inline-block font-mono" style={{ unicodeBidi: "isolate" }}>
                main
              </span>{" "}
              وتنشر على Vercel. المخرجات تظهر في لوحة الطرفية أسفل الصفحة.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                className="flex-1 active:opacity-90"
                onClick={() => void launch()}
                disabled={busy}
              >
                تأكيد التشغيل
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </PageSnapshotPage>
  );
}
