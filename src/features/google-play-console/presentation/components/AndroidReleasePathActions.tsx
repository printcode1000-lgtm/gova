"use client";

import { ExternalLink, FolderOpen, LoaderCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { BuildJobRecord } from "@asol/release-core/console";
import { latestJobFor, RUNNING_STATUSES, StopButton } from "./ReleaseJobIndicators";
import type { StaticPreviewState } from "./use-android-static-preview";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "google-play-console.android-release-path-actions.div.2-b5LZi0", id: "google-play-console.android-release-path-actions.div.2" })} id="google-play-console.android-release-path-actions.div" className="mt-2 flex flex-wrap items-center gap-2">
      <Button id="google-play-console.android-release-path-actions.button"
        ui={{
          uid: "release-console.android-paths.open-outputs-PXYR0B",
          id: "release-console.android-paths.open-outputs",
          kind: "action",
          action: "open-outputs",
          part: "actions",
        }}
        disabled={busy}
        variant="outline"
        onClick={() => void start({ commandId: "android-open-outputs" })}
      >
        {openOutputsRunning ? (
          <LoaderCircle id="google-play-console.android-release-path-actions.loader-circle" className="h-4 w-4 animate-spin" />
        ) : (
          <FolderOpen id="google-play-console.android-release-path-actions.folder-open" className="h-4 w-4" />
        )}
        {t("releaseConsole.androidPaths.openOutputs")}
      </Button>
      {openOutputsRunning && openOutputsJob ? (
        <StopButton id="google-play-console.android-release-path-actions.stop-button" cancel={cancel} job={openOutputsJob} t={t} />
      ) : null}
      <Button id="google-play-console.android-release-path-actions.button.2"
        ui={{
          uid: "release-console.android-paths.preview-I4nRLG",
          id: "release-console.android-paths.preview",
          kind: "action",
          action: "open-preview",
          part: "actions",
        }}
        disabled={previewState === "checking"}
        variant="outline"
        onClick={() => void openPreview()}
      >
        {previewState === "checking" ? (
          <LoaderCircle id="google-play-console.android-release-path-actions.loader-circle.2" className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink id="google-play-console.android-release-path-actions.external-link" className="h-4 w-4" />
        )}
        {t("releaseConsole.androidPaths.openPreview")}
      </Button>
      {previewState === "offline" ? (
        <span {...uiAttributes({ uid: "google-play-console.android-release-path-actions.span.3-p9IFx0", id: "google-play-console.android-release-path-actions.span.3" })} id="google-play-console.android-release-path-actions.span"
          role="alert"
          className="rounded-md bg-error-container px-2 py-1 text-xs text-on-error-container"
        >
          {t("releaseConsole.androidPaths.previewOffline")}
        </span>
      ) : null}
      {openOutputsJob ? (
        <span {...uiAttributes({ uid: "google-play-console.android-release-path-actions.span.4-35hNmQ", id: "google-play-console.android-release-path-actions.span.4" })} id="google-play-console.android-release-path-actions.span.2" className="text-xs text-on-surface-variant">
          {t(`releaseConsole.jobStatus.${openOutputsJob.status}`)}
        </span>
      ) : null}
    </div>
  );
}
