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
    <section className="rounded-lg border bg-surface-container-low p-2">
      <h2 className="font-semibold">{t("releaseConsole.androidPaths.groupTitle")}</h2>
      <p className="mt-1 text-xs leading-5 text-on-surface-variant">
        {t("releaseConsole.androidPaths.groupHelp")}
      </p>
      <div className="mt-3 space-y-3">
        <section className="rounded-lg border bg-surface-container p-2">
          <h3 className="text-sm font-semibold">{t("releaseConsole.androidPaths.phaseTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            {t("releaseConsole.androidPaths.phaseHelp")}
          </p>
          <Tabs className="mt-2" value={activePath} onValueChange={setActivePath}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              {ANDROID_RELEASE_PATHS.map((path) => (
                <TabsTrigger key={path.id} value={path.id}>
                  {t(path.title)}
                </TabsTrigger>
              ))}
            </TabsList>
            {ANDROID_RELEASE_PATHS.map((path) => (
              <TabsContent key={path.id} value={path.id} className="mt-2 space-y-3">
                <p className="text-sm leading-6 text-on-surface-variant">{t(path.description)}</p>
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
          <p className="mt-2 text-xs text-on-surface-variant">
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
