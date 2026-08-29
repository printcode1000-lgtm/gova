"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  allAndroidReleaseBranchIds,
  androidReleaseRunbookFor,
  branchIdsFromAndroidRunbook,
  type BuildCommandReadiness,
  type BuildJobRecord,
} from "@asol/release-core/console";
import { ANDROID_RELEASE_PATHS } from "./android-release-paths-data";
import { AndroidReleasePathActions } from "./AndroidReleasePathActions";
import { AndroidReleasePathsTerminal } from "./AndroidReleasePathsTerminal";
import { AndroidReleaseRunbookTree } from "./AndroidReleaseRunbookTree";
import { useAndroidStaticPreview } from "./use-android-static-preview";
import { uiAttributes } from "@asol/ui-registry-core";

const DEFAULT_ENABLED_BRANCHES = new Set<string>(allAndroidReleaseBranchIds());
const DEFAULT_ACTIVE_PATH = ANDROID_RELEASE_PATHS[0]?.id ?? "release-android";

export function AndroidReleasePaths({
  activeJob,
  busy,
  cancel,
  clearLog,
  jobs,
  log,
  readiness,
  start,
  t,
}: {
  readonly activeJob: BuildJobRecord | undefined;
  readonly busy: boolean;
  readonly cancel: (job: BuildJobRecord) => Promise<unknown>;
  readonly clearLog: () => void;
  readonly jobs: readonly BuildJobRecord[];
  readonly log: string;
  readonly readiness: readonly BuildCommandReadiness[];
  readonly start: (input: {
    commandId: string;
    parameters?: Record<string, unknown>;
  }) => Promise<unknown>;
  readonly t: (key: string, params?: Record<string, string>) => string;
}) {
  const [enabledBranches, setEnabledBranches] = React.useState(DEFAULT_ENABLED_BRANCHES);
  const [activePath, setActivePath] = React.useState<string>(DEFAULT_ACTIVE_PATH);
  const { openPreview, previewState } = useAndroidStaticPreview();

  const missingEnvOf = (commandId: string) => {
    const entry = readiness.find((item) => item.commandId === commandId);
    return entry && !entry.ready ? entry.missingEnv : [];
  };

  const activeRunbook = androidReleaseRunbookFor(activePath);
  const activeBranchIds = branchIdsFromAndroidRunbook(activeRunbook);
  const selectedInTab = activeBranchIds.filter((id) => enabledBranches.has(id)).length;

  return (
    <section {...uiAttributes({ uid: "google-play-console.android-release-paths.section.3-741CJL", id: "google-play-console.android-release-paths.section.3" })} id="google-play-console.android-release-paths.section" className="rounded-lg border bg-surface-container-low p-2">
      <h2 {...uiAttributes({ uid: "google-play-console.android-release-paths.h2.2-1osGJI", id: "google-play-console.android-release-paths.h2.2" })} id="google-play-console.android-release-paths.h2" className="font-semibold">{t("releaseConsole.androidPaths.groupTitle")}</h2>
      <p {...uiAttributes({ uid: "google-play-console.android-release-paths.p.4-7a5ClR", id: "google-play-console.android-release-paths.p.4" })} id="google-play-console.android-release-paths.p" className="mt-1 text-xs leading-5 text-on-surface-variant">
        {t("releaseConsole.androidPaths.groupHelp")}
      </p>
      <div {...uiAttributes({ uid: "google-play-console.android-release-paths.div.2-j1JEM9", id: "google-play-console.android-release-paths.div.2" })} id="google-play-console.android-release-paths.div" className="mt-3 space-y-3">
        <section {...uiAttributes({ uid: "google-play-console.android-release-paths.section.4-1XKAVp", id: "google-play-console.android-release-paths.section.4" })} id="google-play-console.android-release-paths.section.2" className="rounded-lg border bg-surface-container p-2">
          <h3 {...uiAttributes({ uid: "google-play-console.android-release-paths.h3.2-7OMjZD", id: "google-play-console.android-release-paths.h3.2" })} id="google-play-console.android-release-paths.h3" className="text-sm font-semibold">{t("releaseConsole.androidPaths.phaseTitle")}</h3>
          <p {...uiAttributes({ uid: "google-play-console.android-release-paths.p.5-4AdXUz", id: "google-play-console.android-release-paths.p.5" })} id="google-play-console.android-release-paths.p.2" className="mt-1 text-xs leading-5 text-on-surface-variant">
            {t("releaseConsole.androidPaths.phaseHelp")}
          </p>
          <Tabs className="mt-2" value={activePath} onValueChange={setActivePath}>
            <TabsList ui={{ uid: "google-play-console.android-release-paths.tabs-list.2-tNKz37", id: "google-play-console.android-release-paths.tabs-list.2" }} id="google-play-console.android-release-paths.tabs-list" className="flex h-auto w-full flex-wrap justify-start gap-1">
              {ANDROID_RELEASE_PATHS.map((path) => (
                <TabsTrigger key={path.id} ui={{ uid: "google-play-console.android-release-paths.tabs-trigger-0IpQ8l", id: "google-play-console.android-release-paths.tabs-trigger" }} value={path.id}>
                  {t(path.title)}
                </TabsTrigger>
              ))}
            </TabsList>
            {ANDROID_RELEASE_PATHS.map((path) => (
              <TabsContent key={path.id} ui={{ uid: "google-play-console.android-release-paths.tabs-content-WRo24V", id: "google-play-console.android-release-paths.tabs-content" }} value={path.id} className="mt-2 space-y-3">
                <p {...uiAttributes({ uid: "google-play-console.android-release-paths.p.6-5BqQgX", id: "google-play-console.android-release-paths.p.6" })} className="text-sm leading-6 text-on-surface-variant">{t(path.description)}</p>
                <AndroidReleaseRunbookTree
                  runbook={androidReleaseRunbookFor(path.id)}
                  selected={enabledBranches}
                  setSelected={setEnabledBranches}
                  t={t}
                  busy={busy}
                  cancel={cancel}
                  jobs={jobs}
                  missingEnvOf={missingEnvOf}
                  start={start}
                />
              </TabsContent>
            ))}
          </Tabs>
          <p {...uiAttributes({ uid: "google-play-console.android-release-paths.p.7-YfXS9J", id: "google-play-console.android-release-paths.p.7" })} id="google-play-console.android-release-paths.p.3" className="mt-2 text-xs text-on-surface-variant">
            {t("releaseConsole.androidPaths.tabSelectionSummary", {
              selected: String(selectedInTab),
              total: String(activeBranchIds.length),
            })}
          </p>
        </section>
      </div>

      <AndroidReleasePathsTerminal
        activeJob={activeJob}
        clearLog={clearLog}
        log={log}
        t={t}
      />

      <AndroidReleasePathActions
        busy={busy}
        cancel={cancel}
        jobs={jobs}
        openPreview={openPreview}
        previewState={previewState}
        start={start}
        t={t}
      />
    </section>
  );
}
