"use client";

import type { ReleaseVersionSnapshot } from "@asol/release-core/console";
import {
  isNativeVersion,
  nextContentVersion,
  nextNativePatchVersion,
  releaseContentVersion,
} from "@asol/ota-core";
import { uiAttributes } from "@asol/ui-registry-core";

/** The shell this run will produce, before any content number is derived. */
function targetNativeVersion(
  versions: ReleaseVersionSnapshot,
  parameters: Record<string, unknown>,
): string | undefined {
  const production = versions.androidProduction;
  if (!production || !isNativeVersion(production)) return undefined;
  const target = parameters.nativeVersionAction === "increment-patch"
    ? nextNativePatchVersion(production)
    : production;
  return isNativeVersion(target) ? target : undefined;
}

/**
 * Previews are best-effort: the snapshot can be missing or, until the first
 * release on the new scheme, hold a legacy version the rules reject. A card
 * that cannot be derived is left out rather than shown as a guess.
 */
function previewOrUndefined(derive: () => string): string | undefined {
  try {
    return derive();
  } catch {
    return undefined;
  }
}

export function ReleaseCurrentVersions({ id, versions, t }: {
  versions: ReleaseVersionSnapshot;
  t: (key: string) => string;
} & { id?: string }) {
  const unavailable = t("releaseConsole.confirmRun.versionUnavailable");
  return <section {...uiAttributes({ uid: "google-play-console.release-version-summary.section-VlZ4YR", id: "google-play-console.release-version-summary.section" })} id={id} className="space-y-2" aria-label={t("releaseConsole.confirmRun.versionSummaryTitle")}>
    <h3 {...uiAttributes({ uid: "google-play-console.release-version-summary.h3-7H2dp3", id: "google-play-console.release-version-summary.h3" })} className="font-semibold">{t("releaseConsole.confirmRun.versionSummaryTitle")}</h3>
    <div {...uiAttributes({ uid: "google-play-console.release-version-summary.div-dFE3Zi", id: "google-play-console.release-version-summary.div" })} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <VersionCard label={t("releaseConsole.confirmRun.currentAndroidProductionVersion")}
        value={versions.androidProduction ?? unavailable} />
      <VersionCard label={t("releaseConsole.confirmRun.currentAndroidVersion")}
        value={versions.androidCurrent ?? unavailable} />
      <VersionCard label={t("releaseConsole.confirmRun.currentIosProductionVersion")}
        value={versions.iosProduction ?? unavailable} />
      <VersionCard label={t("releaseConsole.confirmRun.currentContentVersion")}
        value={versions.contentCurrent ?? unavailable} />
      <VersionCard label={t("releaseConsole.confirmRun.currentOtaVersion")}
        value={versions.otaCurrent ?? unavailable} />
    </div>
    {versions.androidTruthError ? (
      <p {...uiAttributes({ uid: "google-play-console.release-version-summary.p-G92Tb3", id: "google-play-console.release-version-summary.p" })} className="text-sm text-destructive">{versions.androidTruthError}</p>
    ) : null}
    {versions.iosStoreDistribution === false ? (
      <p {...uiAttributes({ uid: "google-play-console.release-version-summary.p.2-3Kg6En", id: "google-play-console.release-version-summary.p.2" })} className="text-sm text-on-surface-variant">
        {t("releaseConsole.confirmRun.appStoreDistributionNotLive")}
      </p>
    ) : versions.iosTruthError ? (
      <p {...uiAttributes({ uid: "google-play-console.release-version-summary.p.3-7TEL5P", id: "google-play-console.release-version-summary.p.3" })} className="text-sm text-destructive">{versions.iosTruthError}</p>
    ) : null}
    {versions.iosStoreDistribution !== false && versions.iosReady === false ? (
      <p {...uiAttributes({ uid: "google-play-console.release-version-summary.p.4-u9EMKd", id: "google-play-console.release-version-summary.p.4" })} className="text-sm text-destructive">{t("releaseConsole.confirmRun.appStoreCredentialsMissing")}</p>
    ) : null}
  </section>;
}

export function ReleaseSelectedVersions({ id, commandId, versions, parameters, t }: {
  commandId: string;
  versions: ReleaseVersionSnapshot;
  parameters: Record<string, unknown>;
  t: (key: string) => string;
} & { id?: string }) {
  const target = targetNativeVersion(versions, parameters);
  const production = versions.androidProduction;
  const selected = [
    commandId === "release-android"
      ? [
        parameters.nativeVersionAction === "increment-patch"
          ? "selectedNewAndroidVersion"
          : "selectedAndroidBuildVersion",
        production && parameters.nativeVersionAction === "increment-patch"
          ? nextNativePatchVersion(production)
          : production,
      ]
      : null,
    // The release opens the shell's own content line; nothing is published for
    // it, so the number comes from the shell rather than from R2.
    commandId === "release-android" && target
      ? ["selectedNewContentVersion", previewOrUndefined(() => releaseContentVersion(target))]
      : null,
    commandId === "ota-publish" && production && isNativeVersion(production)
      ? ["selectedNewOtaVersion", previewOrUndefined(
        () => nextContentVersion(versions.otaCurrent ?? null, production),
      )]
      : null,
    ["build-static", "cap-prepare-android", "android-build-debug"].includes(commandId)
      ? ["selectedContentBuildVersion", versions.contentCurrent]
      : null,
  ].filter((item): item is [string, string] => Boolean(item?.[1]));
  if (selected.length === 0) return null;
  return <section {...uiAttributes({ uid: "google-play-console.release-version-summary.section.2-1pj1YO", id: "google-play-console.release-version-summary.section.2" })} id={id} className="space-y-2" aria-label={t("releaseConsole.confirmRun.planSummaryTitle")}>
    <h3 {...uiAttributes({ uid: "google-play-console.release-version-summary.h3.2-Z8Zf7X", id: "google-play-console.release-version-summary.h3.2" })} className="font-semibold">{t("releaseConsole.confirmRun.planSummaryTitle")}</h3>
    <div {...uiAttributes({ uid: "google-play-console.release-version-summary.div.2-34O3Ry", id: "google-play-console.release-version-summary.div.2" })} className="grid gap-2 sm:grid-cols-2">
      {selected.map(([label, version]) => (
        <VersionCard key={label} label={t(`releaseConsole.confirmRun.${label}`)}
          value={version} emphasized />
      ))}
    </div>
  </section>;
}

function VersionCard({ id, label, value, emphasized = false }: {
  label: string;
  value: string;
  emphasized?: boolean;
} & { id?: string }) {
  return <div {...uiAttributes({ uid: "google-play-console.release-version-summary.div.3-c9LMQZ", id: "google-play-console.release-version-summary.div.3" })} id={id} role="status" className={`rounded-lg border p-3 ${emphasized
    ? "border-primary bg-primary/10"
    : "bg-muted/40"}`}>
    <p {...uiAttributes({ uid: "google-play-console.release-version-summary.p.5-sXIMJ1", id: "google-play-console.release-version-summary.p.5" })} className="text-xs leading-5 text-on-surface-variant">{label}</p>
    <code {...uiAttributes({ uid: "google-play-console.release-version-summary.code-5hALKu", id: "google-play-console.release-version-summary.code" })} className="mt-1 block text-lg font-bold" dir="ltr">{value}</code>
  </div>;
}
