"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BuildCommandReadiness, BuildJobRecord } from "@asol/release-core/console";
import { ANDROID_RELEASE_PATHS } from "./android-release-paths-data";
import { AndroidReleasePathActions } from "./AndroidReleasePathActions";
import { AndroidReleasePathCard } from "./AndroidReleasePathCard";
import { useAndroidStaticPreview } from "./use-android-static-preview";

const DEFAULT_ENABLED_PATHS = new Set<string>(ANDROID_RELEASE_PATHS.map((path) => path.id));
const DEFAULT_ACTIVE_PATH = ANDROID_RELEASE_PATHS[0]?.id ?? "release-android";

export function AndroidReleasePaths({
  busy,
  cancel,
  jobs,
  readiness,
  start,
  t,
}: {
  readonly busy: boolean;
  readonly cancel: (job: BuildJobRecord) => Promise<unknown>;
  readonly jobs: readonly BuildJobRecord[];
  readonly readiness: readonly BuildCommandReadiness[];
  readonly start: (input: { commandId: string }) => Promise<unknown>;
  readonly t: (key: string, params?: Record<string, string>) => string;
}) {
  const [enabledPaths, setEnabledPaths] = React.useState(DEFAULT_ENABLED_PATHS);
  const [activePath, setActivePath] = React.useState<string>(DEFAULT_ACTIVE_PATH);
  const { openPreview, previewState } = useAndroidStaticPreview();

  const missingEnvOf = (commandId: string) => {
    const entry = readiness.find((item) => item.commandId === commandId);
    return entry && !entry.ready ? entry.missingEnv : [];
  };
  const setPathEnabled = (id: string, enabled: boolean) => {
    setEnabledPaths((current) => {
      const next = new Set(current);
      if (enabled) next.add(id);
      else next.delete(id);
      return next;
    });
  };

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
              <TabsContent key={path.id} value={path.id} className="mt-2">
                <AndroidReleasePathCard
                  busy={busy}
                  cancel={cancel}
                  enabled={enabledPaths.has(path.id)}
                  jobs={jobs}
                  missingEnv={missingEnvOf(path.id)}
                  path={path}
                  setEnabled={(enabled) => setPathEnabled(path.id, enabled)}
                  start={start}
                  t={t}
                />
              </TabsContent>
            ))}
          </Tabs>
        </section>
      </div>
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
