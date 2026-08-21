"use client";

import { CloudUpload, LoaderCircle, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BuildJobRecord } from "@asol/release-core/console";
import type { AndroidReleasePath } from "./android-release-paths-data";
import {
  latestJobFor,
  runningLabel,
  RUNNING_STATUSES,
  SecondaryAction,
  StatusChip,
  StopButton,
} from "./ReleaseJobIndicators";

export function AndroidReleasePathCard({
  busy,
  cancel,
  enabled,
  jobs,
  missingEnv,
  path,
  setEnabled,
  start,
  t,
}: {
  readonly busy: boolean;
  readonly cancel: (job: BuildJobRecord) => Promise<unknown>;
  readonly enabled: boolean;
  readonly jobs: readonly BuildJobRecord[];
  readonly missingEnv: readonly string[];
  readonly path: AndroidReleasePath;
  readonly setEnabled: (enabled: boolean) => void;
  readonly start: (input: { commandId: string }) => Promise<unknown>;
  readonly t: (key: string, params?: Record<string, string>) => string;
}) {
  const secondaries = path.secondaries ?? [];
  const job = latestJobFor(jobs, path.id);
  const secondaryJobs = secondaries.map((secondary) => ({
    secondary,
    job: latestJobFor(jobs, secondary.id),
  }));
  const running = Boolean(job && RUNNING_STATUSES.has(job.status));
  const disabled = busy || !enabled || missingEnv.length > 0;

  return (
    <article className="rounded-md border bg-surface p-3">
      <label className="flex items-start gap-2">
        <input
          checked={enabled}
          className="mt-1 h-4 w-4 accent-primary"
          type="checkbox"
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>
          <span className="block font-semibold">{t(path.title)}</span>
          <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
            {t("releaseConsole.androidPaths.branchCheckboxHelp")}
          </span>
        </span>
      </label>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant">{t(path.description)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={disabled}
          variant={path.danger ? "destructive" : "default"}
          onClick={() => void start({ commandId: path.id })}
        >
          {running ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : path.danger ? (
            <CloudUpload className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running ? runningLabel(job, t) : t(path.action)}
        </Button>
        {secondaryJobs.map(({ secondary, job: secondaryJob }) => (
          <SecondaryAction
            key={secondary.id}
            cancel={cancel}
            disabled={disabled}
            icon={secondary.icon}
            id={secondary.id}
            job={secondaryJob}
            label={secondary.label}
            start={start}
            t={t}
          />
        ))}
        {running && job ? <StopButton cancel={cancel} job={job} t={t} /> : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-on-surface-variant">
        {enabled
          ? t("releaseConsole.androidPaths.enabledBranchHelp")
          : t("releaseConsole.androidPaths.skippedBranchHelp")}
      </p>
      {missingEnv.length > 0 ? (
        <p className="mt-2 rounded-md bg-muted p-2 text-xs">
          {t("releaseConsole.build.notReady", { names: missingEnv.join(", ") })}
        </p>
      ) : null}
      {job ? <StatusChip job={job} t={t} /> : null}
      {secondaryJobs.map(({ secondary, job: secondaryJob }) =>
        secondaryJob ? <StatusChip key={secondary.id} job={secondaryJob} t={t} /> : null,
      )}
    </article>
  );
}
