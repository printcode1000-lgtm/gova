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
    <article id='google-play-console-presentation-components-androidreleasepathcard-article-1-nkrw8x' className="rounded-md border bg-surface p-3">
      <label id='google-play-console-presentation-components-androidreleasepathcard-label-2-migtck' className="flex items-start gap-2">
        <input
          id='google-play-console-presentation-components-androidreleasepathcard-input-3-bvypdv'
          checked={enabled}
          className="mt-1 h-4 w-4 accent-primary"
          type="checkbox"
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span id='google-play-console-presentation-components-androidreleasepathcard-text-4-qj3xpo'>
          <span id='google-play-console-presentation-components-androidreleasepathcard-text-5-1zy7bk' className="block font-semibold">
            {t(path.title)}
          </span>
          <span
            id='google-play-console-presentation-components-androidreleasepathcard-text-6-1pueo7'
            className="mt-1 block text-xs leading-5 text-on-surface-variant"
          >
            {t("releaseConsole.androidPaths.branchCheckboxHelp")}
          </span>
        </span>
      </label>
      <p
        id='google-play-console-presentation-components-androidreleasepathcard-text-7-gmwt0m'
        className="mt-3 text-sm leading-6 text-on-surface-variant"
      >
        {t(path.description)}
      </p>
      <div id='google-play-console-presentation-components-androidreleasepathcard-div-8-pzzq9c' className="mt-3 flex flex-wrap gap-2">
        <Button
          id='google-play-console-presentation-components-androidreleasepathcard-button-9-0qdslz'
          disabled={disabled}
          variant={path.danger ? "destructive" : "default"}
          onClick={() => void start({ commandId: path.id })}
        >
          {running ? (
            <LoaderCircle
              id='google-play-console-presentation-components-androidreleasepathcard-loadercircle-10-4mnygr'
              className="h-4 w-4 animate-spin"
            />
          ) : path.danger ? (
            <CloudUpload id='google-play-console-presentation-components-androidreleasepathcard-cloudupload-11-cgvzsk' className="h-4 w-4" />
          ) : (
            <Play id='google-play-console-presentation-components-androidreleasepathcard-play-12-v7krxt' className="h-4 w-4" />
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
            id='google-play-console-presentation-components-androidreleasepathcard-stopbutton-13-r5laoe'
            cancel={cancel}
            job={job}
            t={t}
          />
        ) : null}
      </div>
      <p
        id='google-play-console-presentation-components-androidreleasepathcard-text-14-75kozr'
        className="mt-2 text-xs leading-5 text-on-surface-variant"
      >
        {enabled
          ? t("releaseConsole.androidPaths.enabledBranchHelp")
          : t("releaseConsole.androidPaths.skippedBranchHelp")}
      </p>
      {missingEnv.length > 0 ? (
        <p id='google-play-console-presentation-components-androidreleasepathcard-text-15-reg4mk' className="mt-2 rounded-md bg-muted p-2 text-xs">
          {t("releaseConsole.build.notReady", { names: missingEnv.join(", ") })}
        </p>
      ) : null}
      {job ? <StatusChip id='google-play-console-presentation-components-androidreleasepathcard-statuschip-16-asrdxw' job={job} t={t} /> : null}
      {secondaryJobs.map(({ secondary, job: secondaryJob }) =>
        secondaryJob ? <StatusChip key={secondary.id} job={secondaryJob} t={t} /> : null,
      )}
    </article>
  );
}
