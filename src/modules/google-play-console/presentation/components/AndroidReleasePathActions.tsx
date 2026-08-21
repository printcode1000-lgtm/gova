"use client";

import { ExternalLink, FolderOpen, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BuildJobRecord } from "@asol/release-core/console";
import { latestJobFor, RUNNING_STATUSES, StopButton } from "./ReleaseJobIndicators";
import type { StaticPreviewState } from "./use-android-static-preview";

export function AndroidReleasePathActions({
  busy,
  cancel,
  jobs,
  openPreview,
  previewState,
  start,
  t,
}: {
  readonly busy: boolean;
  readonly cancel: (job: BuildJobRecord) => Promise<unknown>;
  readonly jobs: readonly BuildJobRecord[];
  readonly openPreview: () => Promise<void>;
  readonly previewState: StaticPreviewState;
  readonly start: (input: { commandId: string }) => Promise<unknown>;
  readonly t: (key: string) => string;
}) {
  const openOutputsJob = latestJobFor(jobs, "android-open-outputs");
  const openOutputsRunning = Boolean(openOutputsJob && RUNNING_STATUSES.has(openOutputsJob.status));

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button
        disabled={busy}
        variant="outline"
        onClick={() => void start({ commandId: "android-open-outputs" })}
      >
        {openOutputsRunning ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <FolderOpen className="h-4 w-4" />
        )}
        {t("releaseConsole.androidPaths.openOutputs")}
      </Button>
      {openOutputsRunning && openOutputsJob ? (
        <StopButton cancel={cancel} job={openOutputsJob} t={t} />
      ) : null}
      <Button
        disabled={previewState === "checking"}
        variant="outline"
        onClick={() => void openPreview()}
      >
        {previewState === "checking" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        {t("releaseConsole.androidPaths.openPreview")}
      </Button>
      {previewState === "offline" ? (
        <span
          role="alert"
          className="rounded-md bg-error-container px-2 py-1 text-xs text-on-error-container"
        >
          {t("releaseConsole.androidPaths.previewOffline")}
        </span>
      ) : null}
      {openOutputsJob ? (
        <span className="text-xs text-on-surface-variant">
          {t(`releaseConsole.jobStatus.${openOutputsJob.status}`)}
        </span>
      ) : null}
    </div>
  );
}
