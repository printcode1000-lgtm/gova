"use client";

import { Activity, LockKeyhole, Package, Radio, ShieldCheck } from "lucide-react";

import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useReleaseOverview } from "../hooks/use-release-overview";
import { Metric } from "../components/Metric";
import { createUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

export function OverviewTab() {
  const { t } = useAdminArabic();
  const { snapshot, jobs } = useReleaseOverview();
  if (!snapshot) return <div {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.div.9-3CSPVx", id: "google-play-console.tabs.overview-tab.div.9" })} id="google-play-console.tabs.overview-tab.div" className="p-4 text-sm text-on-surface-variant">{t("releaseConsole.loading")}</div>;
  const activeTracks = (snapshot.tracks ?? []).filter((track) => track.releases.length);
  const activeJob = jobs.find((job) => job.status === "running" || job.status === "queued");
  return (
    <section {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.section.4-a5FqtF", id: "google-play-console.tabs.overview-tab.section.4" })} id="google-play-console.tabs.overview-tab.section" className="space-y-4">
      <div {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.div.10-eSCk6Z", id: "google-play-console.tabs.overview-tab.div.10" })} id="google-play-console.tabs.overview-tab.div.2" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric id="google-play-console.tabs.overview-tab.metric" instance={createUiInstanceId("package")} icon={Package} label={t("releaseConsole.overview.package")} value={snapshot.packageName} />
        <Metric id="google-play-console.tabs.overview-tab.metric.2" instance={createUiInstanceId("default-language")} label={t("releaseConsole.overview.defaultLanguage")} value={snapshot.defaultLanguage} />
        <Metric id="google-play-console.tabs.overview-tab.metric.3" instance={createUiInstanceId("live-ota")} icon={Radio} label={t("releaseConsole.overview.liveOta")} value={snapshot.liveOtaVersion ?? "-"} />
        <Metric id="google-play-console.tabs.overview-tab.metric.4"
          instance={createUiInstanceId("active-tracks")}
          icon={Activity}
          label={t("releaseConsole.overview.activeTracks")}
          value={activeTracks.length}
        />
      </div>
      <div {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.div.11-Rw2urV", id: "google-play-console.tabs.overview-tab.div.11" })} id="google-play-console.tabs.overview-tab.div.3" className="grid gap-4 lg:grid-cols-2">
        <section {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.section.5-HzNc63", id: "google-play-console.tabs.overview-tab.section.5" })} id="google-play-console.tabs.overview-tab.section.2" className="rounded-md border bg-surface p-4">
          <h2 {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.h2.3-su2Ave", id: "google-play-console.tabs.overview-tab.h2.3" })} id="google-play-console.tabs.overview-tab.h2" className="flex items-center gap-2 font-semibold">
            <ShieldCheck id="google-play-console.tabs.overview-tab.shield-check" className="h-4 w-4 text-primary" />{t("releaseConsole.overview.guard")}
          </h2>
          <dl {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.dl-SR1yxB", id: "google-play-console.tabs.overview-tab.dl" })} className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.div.12-0WdMcK", id: "google-play-console.tabs.overview-tab.div.12" })} id="google-play-console.tabs.overview-tab.div.4">{t("releaseConsole.overview.allowed")}: {String(snapshot.environment.allowed)}</div>
            <div {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.div.13-a55Kut", id: "google-play-console.tabs.overview-tab.div.13" })} id="google-play-console.tabs.overview-tab.div.5">{t("releaseConsole.overview.mode")}: {snapshot.environment.nodeEnv}</div>
            <div {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.div.14-jBQQU7", id: "google-play-console.tabs.overview-tab.div.14" })} id="google-play-console.tabs.overview-tab.div.6">{t("releaseConsole.overview.publicMode")}: {snapshot.environment.publicMode}</div>
            <div {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.div.15-w1V42M", id: "google-play-console.tabs.overview-tab.div.15" })} id="google-play-console.tabs.overview-tab.div.7">{t("releaseConsole.overview.credentialSource")}:&nbsp;
              {t("releaseConsole.overview.serviceAccountCredential")}</div>
          </dl>
        </section>
        <section {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.section.6-EbgDQ2", id: "google-play-console.tabs.overview-tab.section.6" })} id="google-play-console.tabs.overview-tab.section.3" className="rounded-md border bg-surface p-4">
          <h2 {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.h2.4-Y2v9Dx", id: "google-play-console.tabs.overview-tab.h2.4" })} id="google-play-console.tabs.overview-tab.h2.2" className="flex items-center gap-2 font-semibold">
            <LockKeyhole id="google-play-console.tabs.overview-tab.lock-keyhole" className="h-4 w-4 text-primary" />{t("releaseConsole.overview.jobLock")}
          </h2>
          <div {...uiAttributes({ uid: "google-play-console.tabs.overview-tab.div.16-ec0OLV", id: "google-play-console.tabs.overview-tab.div.16" })} id="google-play-console.tabs.overview-tab.div.8" className="mt-3 text-sm text-on-surface-variant">
            {activeJob ? `${activeJob.command.script} / ${t(`releaseConsole.jobStatus.${activeJob.status}`)}` :
              t("releaseConsole.overview.noActiveJob")}
          </div>
        </section>
      </div>
    </section>
  );
}
