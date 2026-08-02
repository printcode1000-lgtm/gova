"use client";

import { ShieldCheck } from "lucide-react";

import type { GooglePlayStoreAssetsSnapshot } from "../domain/store-assets-types";
import { formatDate } from "./console-utils";

export function OverviewTab({
  snapshot,
  t,
}: {
  snapshot: GooglePlayStoreAssetsSnapshot;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const activeTracks = (snapshot.tracks ?? []).filter((track) => track.releases.length > 0);
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Info label={t("releaseConsole.overview.package")} value={snapshot.packageName} />
      <Info label={t("releaseConsole.overview.defaultLanguage")} value={snapshot.defaultLanguage} />
      <Info label={t("releaseConsole.overview.lastFetch")} value={formatDate(snapshot.fetchedAt)} />
      <Info label={t("releaseConsole.overview.liveOta")} value={snapshot.liveOtaVersion ?? "-"} />
      <div className="rounded-md border bg-surface p-4 md:col-span-2">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {t("releaseConsole.overview.guard")}
        </div>
        <div className="grid gap-2 text-sm text-on-surface-variant sm:grid-cols-2">
          <span>{t("releaseConsole.overview.allowed")}: {String(snapshot.environment.allowed)}</span>
          <span>{t("releaseConsole.overview.mode")}: {snapshot.environment.nodeEnv}</span>
          <span>{t("releaseConsole.overview.publicMode")}: {snapshot.environment.publicMode}</span>
          <span>{t("releaseConsole.overview.credentialSource")}: Google Play service account</span>
        </div>
      </div>
      <div className="rounded-md border bg-surface p-4 md:col-span-2">
        <div className="mb-2 text-sm font-semibold">{t("releaseConsole.overview.activeTracks")}</div>
        <div className="flex flex-wrap gap-2">
          {activeTracks.length ? activeTracks.map((track) => (
            <span key={track.track} className="rounded-md border bg-muted px-2 py-1 text-xs">
              {track.track}: {track.releases.length}
            </span>
          )) : <span className="text-sm text-on-surface-variant">{t("releaseConsole.empty")}</span>}
        </div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-surface p-4">
      <div className="text-xs text-on-surface-variant">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold">{value}</div>
    </div>
  );
}
