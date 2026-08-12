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
  const unavailable = t("releaseConsole.confirmRun.versionUnavailable");
  return <section className="space-y-2" aria-label={t("releaseConsole.confirmRun.versionSummaryTitle")}>
    <h3 className="font-semibold">{t("releaseConsole.confirmRun.versionSummaryTitle")}</h3>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <VersionCard label={t("releaseConsole.confirmRun.currentAppVersion")}
        value={versions.androidCurrent ?? unavailable} />
      <VersionCard label={t("releaseConsole.confirmRun.currentContentVersion")}
        value={versions.contentCurrent ?? unavailable} />
      <VersionCard label={t("releaseConsole.confirmRun.currentOtaVersion")}
        value={versions.otaCurrent ?? unavailable} />
    </div>
  </section>;
}

export function ReleaseSelectedVersions({ commandId, versions, parameters, t }: {
  commandId: string;
  versions: ReleaseVersionSnapshot;
  parameters: Record<string, unknown>;
  t: (key: string) => string;
}) {
  const selected = [
    commandId === "release-android-with-ota"
      && parameters.nativeVersionAction === "increment-patch"
      ? ["selectedNewAndroidVersion", nextPatch(versions.androidCurrent)]
      : null,
    commandId === "ota-publish"
      || (commandId === "release-android-with-ota" && parameters.otaSource === "publish-new")
      ? ["selectedNewOtaVersion", nextPatch(versions.otaCurrent)]
      : null,
    ["build-static", "cap-prepare-android", "android-build-debug"].includes(commandId)
      ? ["selectedContentBuildVersion", versions.contentCurrent]
      : null,
    commandId === "release-android-no-ota"
      ? ["selectedAndroidBuildVersion", versions.androidCurrent]
      : null,
  ].filter((item): item is [string, string] => Boolean(item?.[1]));
  if (selected.length === 0) return null;
  return <section className="space-y-2" aria-label={t("releaseConsole.confirmRun.planSummaryTitle")}>
    <h3 className="font-semibold">{t("releaseConsole.confirmRun.planSummaryTitle")}</h3>
    <div className="grid gap-2 sm:grid-cols-2">
      {selected.map(([label, version]) => (
        <VersionCard key={label} label={t(`releaseConsole.confirmRun.${label}`)}
          value={version} emphasized />
      ))}
    </div>
  </section>;
}

function VersionCard({ label, value, emphasized = false }: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return <div role="status" className={`rounded-lg border p-3 ${emphasized
    ? "border-primary bg-primary/10"
    : "bg-muted/40"}`}>
    <p className="text-xs leading-5 text-on-surface-variant">{label}</p>
    <code className="mt-1 block text-lg font-bold" dir="ltr">{value}</code>
  </div>;
}
