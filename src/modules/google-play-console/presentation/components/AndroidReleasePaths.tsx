"use client";

import { CheckCircle2, CloudUpload, ExternalLink, FolderOpen, LoaderCircle, Play, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BuildJobRecord, BuildJobStatus } from "@/modules/release-commands/domain/build-job-types";

/** Local static preview served by `npm run preview:static`. */
const STATIC_PREVIEW_URL = "http://127.0.0.1:5500/";

const PATHS = [
  {
    id: "release-android-with-ota",
    title: "releaseConsole.androidPaths.withOta.title",
    description: "releaseConsole.androidPaths.withOta.description",
  },
  {
    id: "release-android-no-ota",
    title: "releaseConsole.androidPaths.noOta.title",
    description: "releaseConsole.androidPaths.noOta.description",
  },
  {
    id: "build-static",
    title: "releaseConsole.androidPaths.buildStatic.title",
    description: "releaseConsole.androidPaths.buildStatic.description",
  },
  {
    id: "cap-prepare-android",
    title: "releaseConsole.androidPaths.prepare.title",
    description: "releaseConsole.androidPaths.prepare.description",
    // Secondary action on the same card: open the synced project in the IDE.
    secondary: {
      id: "cap-open-android",
      label: "releaseConsole.build.openAndroidStudio",
    },
  },
  {
    id: "ota-publish",
    title: "releaseConsole.androidPaths.publishOta.title",
    description: "releaseConsole.androidPaths.publishOta.description",
    // Publishes live to R2; the confirmation dialog also demands its phrase.
    danger: true,
  },
] as const;

const RUNNING_STATUSES = new Set<BuildJobStatus>(["queued", "running"]);

/** Latest job for a command — the list arrives newest first. */
function latestJobFor(jobs: readonly BuildJobRecord[], commandId: string): BuildJobRecord | undefined {
  return jobs.find((job) => job.commandId === commandId);
}

function StatusChip({ job, t }: { job: BuildJobRecord; t: (key: string) => string }) {
  const running = RUNNING_STATUSES.has(job.status);
  const tone = running ? "bg-muted text-on-surface"
    : job.status === "succeeded" ? "bg-primary-container text-on-primary-container"
      : "bg-error-container text-on-error-container";
  const Icon = running ? LoaderCircle : job.status === "succeeded" ? CheckCircle2 : XCircle;
  return (
    <p role="status" className={`mt-2 flex flex-wrap items-center gap-2 rounded-md p-2 text-xs ${tone}`}>
      <Icon className={`h-4 w-4 shrink-0 ${running ? "animate-spin" : ""}`} />
      <span className="font-semibold">{t(`releaseConsole.jobStatus.${job.status}`)}</span>
      <code dir="ltr">{job.id}</code>
      {job.error ? <span dir="ltr">{job.error}</span> : null}
    </p>
  );
}

export function AndroidReleasePaths({ busy, jobs, start, t }: {
  busy: boolean;
  jobs: readonly BuildJobRecord[];
  start: (input: { commandId: string }) => Promise<unknown>;
  t: (key: string) => string;
}) {
  // Both paths live in one container pinned to the top of the tab, so the two
  // one-click releases are reachable without scrolling to their category.
  const openOutputsJob = latestJobFor(jobs, "android-open-outputs");
  const openOutputsRunning = Boolean(openOutputsJob && RUNNING_STATUSES.has(openOutputsJob.status));
  return <section className="rounded-lg border bg-surface-container-low p-2">
    <h2 className="font-semibold">{t("releaseConsole.androidPaths.groupTitle")}</h2>
    <div className="mt-2 grid gap-2 lg:grid-cols-2">
      {PATHS.map((path) => {
        const secondary = "secondary" in path ? path.secondary : undefined;
        // Each card reports its own command's outcome, so "running" is shown on
        // the card that is actually running — the rest are only disabled.
        const job = latestJobFor(jobs, path.id);
        const secondaryJob = secondary ? latestJobFor(jobs, secondary.id) : undefined;
        const running = Boolean(job && RUNNING_STATUSES.has(job.status));
        const secondaryRunning = Boolean(secondaryJob && RUNNING_STATUSES.has(secondaryJob.status));
        return <article key={path.id} className="rounded-md border bg-surface p-2">
          <h3 className="font-semibold">{t(path.title)}</h3>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">{t(path.description)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant={"danger" in path && path.danger ? "destructive" : "default"}
              disabled={busy} onClick={() => void start({ commandId: path.id })}>
              {running ? <LoaderCircle className="h-4 w-4 animate-spin" />
                : "danger" in path && path.danger ? <CloudUpload className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? t("releaseConsole.jobStatus.running") : t("releaseConsole.build.launch")}
            </Button>
            {secondary ? (
              <Button variant="outline" disabled={busy}
                onClick={() => void start({ commandId: secondary.id })}>
                {secondaryRunning
                  ? <LoaderCircle className="h-4 w-4 animate-spin" />
                  : <FolderOpen className="h-4 w-4" />}
                {t(secondary.label)}
              </Button>
            ) : null}
          </div>
          {job ? <StatusChip job={job} t={t} /> : null}
          {secondaryJob ? <StatusChip job={secondaryJob} t={t} /> : null}
        </article>;
      })}
    </div>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {/* Every command button obeys the same page-wide lock, this one included. */}
      <Button variant="outline" disabled={busy}
        onClick={() => void start({ commandId: "android-open-outputs" })}>
        {openOutputsRunning
          ? <LoaderCircle className="h-4 w-4 animate-spin" />
          : <FolderOpen className="h-4 w-4" />}
        {t("releaseConsole.androidPaths.openOutputs")}
      </Button>
      {/* `window.open` rather than a plain anchor: embedded webviews ignore
          target="_blank" on links, and this must always be a new tab. */}
      <Button variant="outline"
        onClick={() => window.open(STATIC_PREVIEW_URL, "_blank", "noopener,noreferrer")}>
        <ExternalLink className="h-4 w-4" />{t("releaseConsole.build.preview")}
      </Button>
      {openOutputsJob ? (
        <span className="text-xs text-on-surface-variant">
          {t(`releaseConsole.jobStatus.${openOutputsJob.status}`)}
        </span>
      ) : null}
    </div>
  </section>;
}
