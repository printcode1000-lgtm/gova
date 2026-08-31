"use client";

import { CloudUpload, LoaderCircle, Play } from "lucide-react";

import { Button } from "@/shared/ui/button";
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
    <article id="google-play-console.android-release-path-card.article" className="rounded-md border bg-surface p-3">
      <label id="google-play-console.android-release-path-card.label" className="flex items-start gap-2">
        <input
          id="google-play-console.android-release-path-card.input"
          checked={enabled}
          className="mt-1 h-4 w-4 accent-primary"
          type="checkbox"
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span id="google-play-console.android-release-path-card.span">
          <span id="google-play-console.android-release-path-card.span.2" className="block font-semibold">
            {t(path.title)}
          </span>
          <span
            id="google-play-console.android-release-path-card.span.3"
            className="mt-1 block text-xs leading-5 text-on-surface-variant"
          >
            {t("releaseConsole.androidPaths.branchCheckboxHelp")}
          </span>
        </span>
      </label>
      <p
        id="google-play-console.android-release-path-card.p"
        className="mt-3 text-sm leading-6 text-on-surface-variant"
      >
        {t(path.description)}
      </p>
      <div id="google-play-console.android-release-path-card.div" className="mt-3 flex flex-wrap gap-2">
        <Button
          id="google-play-console.android-release-path-card.button"
          disabled={disabled}
          variant={path.danger ? "destructive" : "default"}
          onClick={() => void start({ commandId: path.id })}
        >
          {running ? (
            <LoaderCircle
              id="google-play-console.android-release-path-card.loader-circle"
              className="h-4 w-4 animate-spin"
            />
          ) : path.danger ? (
            <CloudUpload id="google-play-console.android-release-path-card.cloud-upload" className="h-4 w-4" />
          ) : (
            <Play id="google-play-console.android-release-path-card.play" className="h-4 w-4" />
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
        {running && job ? (
          <StopButton
            id="google-play-console.android-release-path-card.stop-button"
            cancel={cancel}
            job={job}
            t={t}
          />
        ) : null}
      </div>
      <p
        id="google-play-console.android-release-path-card.p.2"
        className="mt-2 text-xs leading-5 text-on-surface-variant"
      >
        {enabled
          ? t("releaseConsole.androidPaths.enabledBranchHelp")
          : t("releaseConsole.androidPaths.skippedBranchHelp")}
      </p>
      {missingEnv.length > 0 ? (
        <p id="google-play-console.android-release-path-card.p.3" className="mt-2 rounded-md bg-muted p-2 text-xs">
          {t("releaseConsole.build.notReady", { names: missingEnv.join(", ") })}
        </p>
      ) : null}
      {job ? <StatusChip id="google-play-console.android-release-path-card.status-chip" job={job} t={t} /> : null}
      {secondaryJobs.map(({ secondary, job: secondaryJob }) =>
        secondaryJob ? <StatusChip key={secondary.id} job={secondaryJob} t={t} /> : null,
      )}
    </article>
  );
}
