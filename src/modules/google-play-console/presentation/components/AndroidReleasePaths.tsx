"use client";

import * as React from "react";

import type { BuildCommandReadiness, BuildJobRecord } from "@asol/release-core/console";
import { ANDROID_RELEASE_PATHS } from "./android-release-paths-data";
import { AndroidReleasePathActions } from "./AndroidReleasePathActions";
import { AndroidReleasePathCard } from "./AndroidReleasePathCard";
import { useAndroidStaticPreview } from "./use-android-static-preview";

const DEFAULT_ENABLED_PATHS = new Set(ANDROID_RELEASE_PATHS.map((path) => path.id));

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
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            {ANDROID_RELEASE_PATHS.map((path) => (
              <AndroidReleasePathCard
                key={path.id}
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
            ))}
          </div>
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
