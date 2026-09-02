"use client";

import { Activity, LockKeyhole, Package, Radio, ShieldCheck } from "lucide-react";

import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useReleaseOverview } from "../hooks/use-release-overview";
import { Metric } from "../components/Metric";

export function OverviewTab() {
  const { t } = useAdminArabic();
  const { snapshot, jobs } = useReleaseOverview();
  if (!snapshot)
    return (
      <div id='google-play-console-presentation-tabs-overviewtab-div-1-bnes0s' className="p-4 text-sm text-on-surface-variant">
        {t("releaseConsole.loading")}
      </div>
    );
  const activeTracks = (snapshot.tracks ?? []).filter((track) => track.releases.length);
  const activeJob = jobs.find((job) => job.status === "running" || job.status === "queued");
  return (
    <section id='google-play-console-presentation-tabs-overviewtab-section-2-0mgst1' className="space-y-4">
      <div id='google-play-console-presentation-tabs-overviewtab-div-3-yzwr03' className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          id='google-play-console-presentation-tabs-overviewtab-metric-4-rhplps'
          icon={Package}
          label={t("releaseConsole.overview.package")}
          value={snapshot.packageName}
        />
        <Metric
          id='google-play-console-presentation-tabs-overviewtab-metric-5-ayagtf'
          label={t("releaseConsole.overview.defaultLanguage")}
          value={snapshot.defaultLanguage}
        />
        <Metric
          id='google-play-console-presentation-tabs-overviewtab-metric-6-iu1tx5'
          icon={Radio}
          label={t("releaseConsole.overview.liveOta")}
          value={snapshot.liveOtaVersion ?? "-"}
        />
        <Metric
          id='google-play-console-presentation-tabs-overviewtab-metric-7-iwfxky'
          icon={Activity}
          label={t("releaseConsole.overview.activeTracks")}
          value={activeTracks.length}
        />
      </div>
      <div id='google-play-console-presentation-tabs-overviewtab-div-8-uuzpk4' className="grid gap-4 lg:grid-cols-2">
        <section id='google-play-console-presentation-tabs-overviewtab-section-9-hjbajt' className="rounded-md border bg-surface p-4">
          <h2 id='google-play-console-presentation-tabs-overviewtab-heading-10-z0k6uh' className="flex items-center gap-2 font-semibold">
            <ShieldCheck id='google-play-console-presentation-tabs-overviewtab-shieldcheck-11-nsapa0' className="h-4 w-4 text-primary" />
            {t("releaseConsole.overview.guard")}
          </h2>
          <dl id="google-play-console-presentation-tabs-overviewtab-dl-12-yzyny9" className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div id='google-play-console-presentation-tabs-overviewtab-div-13-ijpvng'>
              {t("releaseConsole.overview.allowed")}:{String(snapshot.environment.allowed)}
            </div>
            <div id='google-play-console-presentation-tabs-overviewtab-div-14-pe9wng'>
              {t("releaseConsole.overview.mode")}:{snapshot.environment.nodeEnv}
            </div>
            <div id='google-play-console-presentation-tabs-overviewtab-div-15-ejv38y'>
              {t("releaseConsole.overview.publicMode")}:{snapshot.environment.publicMode}
            </div>
            <div id='google-play-console-presentation-tabs-overviewtab-div-16-wlns2t'>
              {t("releaseConsole.overview.credentialSource")}:&nbsp;
              {t("releaseConsole.overview.serviceAccountCredential")}
            </div>
          </dl>
        </section>
        <section id='google-play-console-presentation-tabs-overviewtab-section-17-o3pofz' className="rounded-md border bg-surface p-4">
          <h2 id='google-play-console-presentation-tabs-overviewtab-heading-18-a2pcp5' className="flex items-center gap-2 font-semibold">
            <LockKeyhole id='google-play-console-presentation-tabs-overviewtab-lockkeyhole-19-oar35b' className="h-4 w-4 text-primary" />
            {t("releaseConsole.overview.jobLock")}
          </h2>
          <div id='google-play-console-presentation-tabs-overviewtab-div-20-cdqxej' className="mt-3 text-sm text-on-surface-variant">
            {activeJob
              ? `${activeJob.command.script} / ${t(`releaseConsole.jobStatus.${activeJob.status}`)}`
              : t("releaseConsole.overview.noActiveJob")}
          </div>
        </section>
      </div>
    </section>
  );
}
