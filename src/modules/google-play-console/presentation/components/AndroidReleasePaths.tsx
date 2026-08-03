"use client";

import * as React from "react";
import {
  CloudUpload, ExternalLink, FolderOpen, LoaderCircle, Play,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { asolApi } from "@/core/api";
import type { BuildCommandReadiness, BuildJobRecord } from "@/modules/release-commands/domain/build-job-types";
import { latestJobFor, RUNNING_STATUSES, StatusChip, StopButton } from "./ReleaseJobIndicators";

/** Local static preview served by `npm run preview:static`. */
const STATIC_PREVIEW_URL = "http://127.0.0.1:5500/";
const PREVIEW_PROBE_TIMEOUT_MS = 2500;

const PATHS = [
  {
    id: "release-android-with-ota",
    title: "releaseConsole.androidPaths.withOta.title",
    description: "releaseConsole.androidPaths.withOta.description",
    action: "releaseConsole.androidPaths.withOta.action",
  },
  {
    id: "release-android-no-ota",
    title: "releaseConsole.androidPaths.noOta.title",
    description: "releaseConsole.androidPaths.noOta.description",
    action: "releaseConsole.androidPaths.noOta.action",
  },
  {
    id: "build-static",
    title: "releaseConsole.androidPaths.buildStatic.title",
    description: "releaseConsole.androidPaths.buildStatic.description",
    action: "releaseConsole.androidPaths.buildStatic.action",
  },
  {
    id: "cap-prepare-android",
    title: "releaseConsole.androidPaths.prepare.title",
    description: "releaseConsole.androidPaths.prepare.description",
    action: "releaseConsole.androidPaths.prepare.action",
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
    action: "releaseConsole.androidPaths.publishOta.action",
    // Publishes live to R2; the confirmation dialog also demands its phrase.
    danger: true,
  },
] as const;

export function AndroidReleasePaths({ busy, jobs, readiness, start, cancel, t }: {
  busy: boolean;
  jobs: readonly BuildJobRecord[];
  readiness: readonly BuildCommandReadiness[];
  start: (input: { commandId: string }) => Promise<unknown>;
  cancel: (job: BuildJobRecord) => Promise<unknown>;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  // A command whose environment is incomplete must not be offered: the server
  // rejects it with `releaseCommandMissingEnvironment`, which surfaced as a
  // console error instead of a visible reason.
  const readinessFor = (commandId: string) =>
    readiness.find((item) => item.commandId === commandId);
  const missingEnvOf = (commandId: string) => {
    const entry = readinessFor(commandId);
    return entry && !entry.ready ? entry.missingEnv : [];
  };
  // Both paths live in one container pinned to the top of the tab, so the two
  // one-click releases are reachable without scrolling to their category.
  const openOutputsJob = latestJobFor(jobs, "android-open-outputs");
  const openOutputsRunning = Boolean(openOutputsJob && RUNNING_STATUSES.has(openOutputsJob.status));
  const [previewState, setPreviewState] = React.useState<"idle" | "checking" | "offline">("idle");

  // The static preview is a separate local server; opening a dead port would
  // just show a blank tab, so its liveness is probed through the API client
  // first (`serve-static.ts` answers with a permissive CORS header).
  const openPreview = async () => {
    setPreviewState("checking");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PREVIEW_PROBE_TIMEOUT_MS);
    try {
      await asolApi.getAbsoluteBinary(STATIC_PREVIEW_URL, {
        signal: controller.signal, suppressErrorLog: true,
      });
      setPreviewState("idle");
      window.open(STATIC_PREVIEW_URL, "_blank", "noopener,noreferrer");
    } catch {
      setPreviewState("offline");
    } finally {
      clearTimeout(timer);
    }
  };
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
        const missingEnv = missingEnvOf(path.id);
        return <article key={path.id} className="rounded-md border bg-surface p-2">
          <h3 className="font-semibold">{t(path.title)}</h3>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">{t(path.description)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant={"danger" in path && path.danger ? "destructive" : "default"}
              disabled={busy || missingEnv.length > 0}
              onClick={() => void start({ commandId: path.id })}>
              {running ? <LoaderCircle className="h-4 w-4 animate-spin" />
                : "danger" in path && path.danger ? <CloudUpload className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {running ? t("releaseConsole.jobStatus.running") : t(path.action)}
            </Button>
            {secondary ? (
              <Button variant="outline"
                disabled={busy || missingEnvOf(secondary.id).length > 0}
                onClick={() => void start({ commandId: secondary.id })}>
                {secondaryRunning
                  ? <LoaderCircle className="h-4 w-4 animate-spin" />
                  : <FolderOpen className="h-4 w-4" />}
                {t(secondary.label)}
              </Button>
            ) : null}
            {running && job ? <StopButton job={job} cancel={cancel} t={t} /> : null}
            {secondaryRunning && secondaryJob
              ? <StopButton job={secondaryJob} cancel={cancel} t={t} /> : null}
          </div>
          {missingEnv.length > 0 ? (
            <p className="mt-2 rounded-md bg-muted p-2 text-xs">
              {t("releaseConsole.build.notReady", { names: missingEnv.join(", ") })}
            </p>
          ) : null}
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
      {openOutputsRunning && openOutputsJob
        ? <StopButton job={openOutputsJob} cancel={cancel} t={t} /> : null}
      {/* `window.open` rather than a plain anchor: embedded webviews ignore
          target="_blank" on links, and this must always be a new tab. */}
      <Button variant="outline" disabled={previewState === "checking"}
        onClick={() => void openPreview()}>
        {previewState === "checking"
          ? <LoaderCircle className="h-4 w-4 animate-spin" />
          : <ExternalLink className="h-4 w-4" />}
        {t("releaseConsole.androidPaths.openPreview")}
      </Button>
      {previewState === "offline" ? (
        <span role="alert" className="rounded-md bg-error-container px-2 py-1 text-xs text-on-error-container">
          {t("releaseConsole.androidPaths.previewOffline")}
        </span>
      ) : null}
      {openOutputsJob ? (
        <span className="text-xs text-on-surface-variant">
          {t(`releaseConsole.jobStatus.${openOutputsJob.status}`)}
        </span>
      ) : null}
    </div>
  </section>;
}
