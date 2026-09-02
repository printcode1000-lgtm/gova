"use client";

import * as React from "react";
import { CloudUpload, LoaderCircle, Play } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { AndroidReleaseRunbookPhase } from "@asol/release-core/console";
import type { BuildJobRecord } from "@asol/release-core/console";
import { ANDROID_RELEASE_BRANCH_HELP } from "../android-release-runbook-copy";
import {
  latestJobFor,
  runningLabel,
  RUNNING_STATUSES,
  StatusChip,
  StopButton,
} from "./ReleaseJobIndicators";
import type { AndroidRunbookStart } from "./AndroidReleaseRunbookTreeShared";

export function CommandBranchCard(props: {
  item: AndroidReleaseRunbookPhase["sections"][number]["branches"][number];
  selected: boolean;
  help?: string;
  onToggle: () => void;
  t: (key: string, params?: Record<string, string>) => string;
  busy: boolean;
  cancel: (job: BuildJobRecord) => Promise<unknown>;
  job: BuildJobRecord | undefined;
  missingEnv: readonly string[];
  start: AndroidRunbookStart;
} & { id?: string }) {
  const running = Boolean(props.job && RUNNING_STATUSES.has(props.job.status));
  const disabled = props.busy || !props.selected || props.missingEnv.length > 0;
  const defaultHelp = props.t("releaseConsole.androidPaths.branchCheckboxHelp");
  const runLabel = running
    ? runningLabel(props.job, props.t)
    : props.t("releaseConsole.androidPaths.runCommand");

  return (
    <article id={props.id} className="min-w-0 w-full rounded-md border bg-surface p-3 text-sm">
      <label id="google-play-console-presentation-components-androidreleaserunbookbranchcard-label-2-jsggte" className="flex items-start gap-2">
        <input id="google-play-console-presentation-components-androidreleaserunbookbranchcard-input-3-t7ekfb"
          type="checkbox"
          className="mt-0.5 shrink-0"
          checked={props.selected}
          onChange={props.onToggle}
        />
        <span id="google-play-console-presentation-components-androidreleaserunbookbranchcard-text-4-suigwl" className="min-w-0">
          <span id="google-play-console-presentation-components-androidreleaserunbookbranchcard-text-5-pzlrjx" className="block font-medium break-words">{props.item.label}</span>
          <span id="google-play-console-presentation-components-androidreleaserunbookbranchcard-text-6-dtzppl" className="mt-1 block text-xs text-on-surface-variant break-words">
            {props.help ?? defaultHelp}
          </span>
        </span>
      </label>
      <code id="google-play-console-presentation-components-androidreleaserunbookbranchcard-code-7-gesfu9"
        className="mt-2 block w-full min-w-0 overflow-x-auto whitespace-pre-wrap break-all text-xs"
        dir="ltr"
      >
        {props.item.command}
      </code>
      {props.item.dangerous ? (
        <span id="google-play-console-presentation-components-androidreleaserunbookbranchcard-text-8-p59ysi"
          className={
            "mt-2 inline-flex rounded-full bg-error-container px-2 py-0.5 " +
            "text-xs text-on-error-container"
          }
        >
          {props.t("releaseConsole.androidPaths.dangerBadge")}
        </span>
      ) : null}
      <div id="google-play-console-presentation-components-androidreleaserunbookbranchcard-div-9-j9xaxc" className="mt-3 flex flex-wrap gap-2">
        {props.item.patternOnly ? (
          <p id="google-play-console-presentation-components-androidreleaserunbookbranchcard-text-10-nhyo9v" className="text-xs text-on-surface-variant">
            {props.t("releaseConsole.androidPaths.patternOnlyHelp")}
          </p>
        ) : (
          <>
            <Button
              disabled={disabled}
              size="sm"
              variant={props.item.dangerous ? "destructive" : "default"}
              onClick={() =>
                void props.start({
                  commandId: props.item.commandId,
                  parameters: props.item.parameters,
                })
              }
            >
              {running ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : props.item.dangerous ? (
                <CloudUpload className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runLabel}
            </Button>
            {running && props.job ? (
              <StopButton cancel={props.cancel} job={props.job} t={props.t} />
            ) : null}
          </>
        )}
      </div>
      <p id="google-play-console-presentation-components-androidreleaserunbookbranchcard-text-11-mlpuul" className="mt-2 text-xs text-on-surface-variant break-words">
        {props.selected
          ? props.t("releaseConsole.androidPaths.enabledBranchHelp")
          : props.t("releaseConsole.androidPaths.skippedBranchHelp")}
      </p>
      {props.missingEnv.length > 0 ? (
        <p id="google-play-console-presentation-components-androidreleaserunbookbranchcard-text-12-iodb4b" className="mt-2 rounded-md bg-muted p-2 text-xs">
          {props.t("releaseConsole.build.notReady", { names: props.missingEnv.join(", ") })}
        </p>
      ) : null}
      {props.job ? <StatusChip job={props.job} t={props.t} /> : null}
    </article>
  );
}
