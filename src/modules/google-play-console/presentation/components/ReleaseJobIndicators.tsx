"use client";

import { CheckCircle2, LoaderCircle, Square, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BuildJobRecord, BuildJobStatus } from "@/modules/release-commands/domain/build-job-types";

export const RUNNING_STATUSES = new Set<BuildJobStatus>(["queued", "running"]);

/** Latest job for a command — the list arrives newest first. */
export function latestJobFor(jobs: readonly BuildJobRecord[], commandId: string): BuildJobRecord | undefined {
  return jobs.find((job) => job.commandId === commandId);
}

export function StatusChip({ job, t }: {
  job: BuildJobRecord;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const running = RUNNING_STATUSES.has(job.status);
  const tone = running ? "bg-muted text-on-surface"
    : job.status === "succeeded" ? "bg-primary-container text-on-primary-container"
      : "bg-error-container text-on-error-container";
  const Icon = running ? LoaderCircle : job.status === "succeeded" ? CheckCircle2 : XCircle;
  return (
    <p role="status" className={`mt-2 flex flex-wrap items-center gap-2 rounded-md p-2 text-xs ${tone}`}>
      <Icon className={`h-4 w-4 shrink-0 ${running ? "animate-spin" : ""}`} />
      <span className="font-semibold">{t(`releaseConsole.jobStatus.${job.status}`)}</span>
      {job.stage ? <span>{t(
        job.status === "failed"
          ? "releaseConsole.jobProgress.failedAt"
          : "releaseConsole.jobProgress.stage",
        { stage: t(`releaseConsole.jobStage.${job.stage}`) },
      )}</span> : null}
      <code dir="ltr">{job.id}</code>
      {job.error ? <span dir="ltr">{job.error}</span> : null}
    </p>
  );
}

/** Stop button — only rendered while that command's own job is in flight. */
export function StopButton({ job, cancel, t }: {
  job: BuildJobRecord;
  cancel: (job: BuildJobRecord) => Promise<unknown>;
  t: (key: string) => string;
}) {
  return (
    <Button variant="destructive" onClick={() => void cancel(job)}
      title={`${t("releaseConsole.androidPaths.stop")} ${job.id}`}>
      <Square className="h-4 w-4" />{t("releaseConsole.androidPaths.stop")}
    </Button>
  );
}
