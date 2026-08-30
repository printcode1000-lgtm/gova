"use client";

import {
  CheckCircle2, FlaskConical, FolderOpen, LoaderCircle, Smartphone, Square, XCircle,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { BuildJobRecord, BuildJobStatus } from "@asol/release-core/console";
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

export const RUNNING_STATUSES = new Set<BuildJobStatus>(["queued", "running"]);

/** Latest job for a command — the list arrives newest first. */
export function latestJobFor(jobs: readonly BuildJobRecord[], commandId: string): BuildJobRecord | undefined {
  return jobs.find((job) => job.commandId === commandId);
}

/**
 * The label on a launcher button while its job runs.
 *
 * A release runs for the best part of an hour, and "Running" alone cannot be
 * told apart from a stall — so once the job reports a stage, the button says
 * which one. Until then there is nothing truer to show than "Running".
 */
export function runningLabel(
  job: BuildJobRecord | undefined,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  return job?.stage && job.stage !== "queued" && job.stage !== "starting"
    ? t(`releaseConsole.jobStage.${job.stage}`)
    : t("releaseConsole.jobStatus.running");
}

const SECONDARY_ICONS = {
  tests: FlaskConical,
  device: Smartphone,
  folder: FolderOpen,
} as const;

export type SecondaryActionIcon = keyof typeof SECONDARY_ICONS;

/** A companion action on a release card, with its own job state and stop button. */
export function SecondaryAction({ id, label, icon, job, disabled, start, cancel, t }: {
  id: string;
  label: string;
  icon: SecondaryActionIcon;
  job: BuildJobRecord | undefined;
  disabled: boolean;
  start: (input: { commandId: string }) => Promise<unknown>;
  cancel: (job: BuildJobRecord) => Promise<unknown>;
  t: (key: string, params?: Record<string, string>) => string;
} & { id?: string }) {
  const instance = createOpaqueUiInstanceId("secondary-action", id);
  const running = Boolean(job && RUNNING_STATUSES.has(job.status));
  const Icon = SECONDARY_ICONS[icon];
  return <>
    <Button ui={{ uid: "google-play-console.release-job-indicators.button-6RjYFD", id: "google-play-console.release-job-indicators.button", instance: instance }} id={id} variant="outline" disabled={disabled} onClick={() => void start({ commandId: id })}>
      {running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {running ? runningLabel(job, t) : t(label)}
    </Button>
    {running && job ? <StopButton job={job} cancel={cancel} t={t} /> : null}
  </>;
}

export function StatusChip({ id, job, t }: {
  job: BuildJobRecord;
  t: (key: string, params?: Record<string, string>) => string;
} & { id?: string }) {
  const instance = createOpaqueUiInstanceId("status-chip", job.id);
  const running = RUNNING_STATUSES.has(job.status);
  const tone = running ? "bg-muted text-on-surface"
    : job.status === "succeeded" ? "bg-primary-container text-on-primary-container"
      : "bg-error-container text-on-error-container";
  const Icon = running ? LoaderCircle : job.status === "succeeded" ? CheckCircle2 : XCircle;
  return (
    <p {...uiAttributes({ uid: "google-play-console.release-job-indicators.p-M6QKVY", id: "google-play-console.release-job-indicators.p", instance: instance })} id={id}
      role="status"
      className={`mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto rounded-md p-2 text-xs ${tone}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${running ? "animate-spin" : ""}`} />
      <span {...uiAttributes({ uid: "google-play-console.release-job-indicators.span-2iyYYp", id: "google-play-console.release-job-indicators.span", instance: instance })} className="shrink-0 font-semibold">{t(`releaseConsole.jobStatus.${job.status}`)}</span>
      {job.stage ? (
        <span {...uiAttributes({ uid: "google-play-console.release-job-indicators.span.2-lY73Xl", id: "google-play-console.release-job-indicators.span.2", instance: instance })} className="shrink-0">
          {t(
            job.status === "failed"
              ? "releaseConsole.jobProgress.failedAt"
              : "releaseConsole.jobProgress.stage",
            { stage: t(`releaseConsole.jobStage.${job.stage}`) },
          )}
        </span>
      ) : null}
      {/* The step names the individual check, test or package inside the
          stage — on a failed job it is what was running when it broke. */}
      {job.activity ? (
        <span {...uiAttributes({ uid: "google-play-console.release-job-indicators.span.3-bLP1FV", id: "google-play-console.release-job-indicators.span.3", instance: instance })} dir="ltr" className="shrink-0 font-mono opacity-80">{job.activity}</span>
      ) : null}
      <code {...uiAttributes({ uid: "google-play-console.release-job-indicators.code-JV5QvO", id: "google-play-console.release-job-indicators.code", instance: instance })} dir="ltr" className="shrink-0">{job.id}</code>
      {job.error ? (
        <span {...uiAttributes({ uid: "google-play-console.release-job-indicators.span.4-kO59fN", id: "google-play-console.release-job-indicators.span.4", instance: instance })} dir="ltr" className="min-w-0 truncate">{job.error}</span>
      ) : null}
    </p>
  );
}

/** Stop button — only rendered while that command's own job is in flight. */
export function StopButton({ id, job, cancel, t }: {
  job: BuildJobRecord;
  cancel: (job: BuildJobRecord) => Promise<unknown>;
  t: (key: string) => string;
} & { id?: string }) {
  const instance = createOpaqueUiInstanceId("stop-button", job.id);
  return (
    <Button ui={{ uid: "google-play-console.release-job-indicators.button.2-5Qsw75", id: "google-play-console.release-job-indicators.button.2", instance: instance }} id={id} variant="destructive" onClick={() => void cancel(job)}
      title={`${t("releaseConsole.androidPaths.stop")} ${job.id}`}>
      <Square className="h-4 w-4" />{t("releaseConsole.androidPaths.stop")}
    </Button>
  );
}
