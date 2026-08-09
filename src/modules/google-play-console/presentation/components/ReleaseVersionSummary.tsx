"use client";

import type { ReleaseVersionSnapshot } from "@/modules/release-commands/domain/build-job-types";

function nextPatch(version?: string): string | undefined {
  if (!version) return undefined;
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isSafeInteger(part))) return undefined;
  return `${parts[0]}.${parts[1]}.${parts[2]! + 1}`;
}

export function ReleaseCurrentVersions({ versions, t }: {
  versions: ReleaseVersionSnapshot;
  t: (key: string) => string;
}) {
  const nextAndroidVersion = nextPatch(versions.androidCurrent);
  return <div className="grid gap-2 sm:grid-cols-2">
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-on-surface-variant">
        {t("releaseConsole.confirmRun.currentAndroidVersion")}
      </p>
      <code className="mt-1 block text-base font-semibold" dir="ltr">
        {versions.androidCurrent ?? t("releaseConsole.confirmRun.versionUnavailable")}
      </code>
      {nextAndroidVersion ? <p className="mt-1 text-xs text-on-surface-variant">
        {t("releaseConsole.confirmRun.nextAndroidVersion")}: {nextAndroidVersion}
      </p> : null}
    </div>
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-on-surface-variant">
        {t("releaseConsole.confirmRun.currentOtaVersion")}
      </p>
      <code className="mt-1 block text-base font-semibold" dir="ltr">
        {versions.otaCurrent ?? t("releaseConsole.confirmRun.versionUnavailable")}
      </code>
    </div>
  </div>;
}

export function ReleaseSelectedVersions({ versions, parameters, t }: {
  versions: ReleaseVersionSnapshot;
  parameters: Record<string, unknown>;
  t: (key: string) => string;
}) {
  const selected = [
    parameters.nativeVersionAction === "increment-patch"
      ? ["selectedNewAndroidVersion", nextPatch(versions.androidCurrent)]
      : null,
    parameters.otaSource === "publish-new"
      ? ["selectedNewOtaVersion", nextPatch(versions.otaCurrent)]
      : null,
  ].filter((item): item is [string, string] => Boolean(item?.[1]));
  if (selected.length === 0) return null;
  return <div className="grid gap-2 sm:grid-cols-2">
    {selected.map(([label, version]) => (
      <div key={label} role="status"
        className="rounded-lg border border-primary bg-primary/10 p-3">
        <p className="text-xs text-on-surface-variant">
          {t(`releaseConsole.confirmRun.${label}`)}
        </p>
        <code className="mt-1 block text-lg font-semibold" dir="ltr">{version}</code>
      </div>
    ))}
  </div>;
}
