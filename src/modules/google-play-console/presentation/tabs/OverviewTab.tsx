"use client";

import { Activity, LockKeyhole, Package, Radio, ShieldCheck } from "lucide-react";

import { useAdminArabic } from "@/lib/i18n/use-admin-arabic";
import { useReleaseOverview } from "../../hooks/use-release-overview";
import { Metric } from "../components/Metric";

export function OverviewTab() {
  const { t } = useAdminArabic();
  const { snapshot, jobs } = useReleaseOverview();
  if (!snapshot) return <div className="p-4 text-sm text-on-surface-variant">{t("releaseConsole.loading")}</div>;
  const activeTracks = (snapshot.tracks ?? []).filter((track) => track.releases.length);
  const activeJob = jobs.find((job) => job.status === "running" || job.status === "queued");
  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Package} label={t("releaseConsole.overview.package")} value={snapshot.packageName} />
        <Metric label={t("releaseConsole.overview.defaultLanguage")} value={snapshot.defaultLanguage} />
        <Metric icon={Radio} label={t("releaseConsole.overview.liveOta")} value={snapshot.liveOtaVersion ?? "-"} />
        <Metric
          icon={Activity}
          label={t("releaseConsole.overview.activeTracks")}
          value={activeTracks.length}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />{t("releaseConsole.overview.guard")}
          </h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>{t("releaseConsole.overview.allowed")}: {String(snapshot.environment.allowed)}</div>
            <div>{t("releaseConsole.overview.mode")}: {snapshot.environment.nodeEnv}</div>
            <div>{t("releaseConsole.overview.publicMode")}: {snapshot.environment.publicMode}</div>
            <div>{t("releaseConsole.overview.credentialSource")}:&nbsp;
              {t("releaseConsole.overview.serviceAccountCredential")}</div>
          </dl>
        </section>
        <section className="rounded-md border bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <LockKeyhole className="h-4 w-4 text-primary" />{t("releaseConsole.overview.jobLock")}
          </h2>
          <div className="mt-3 text-sm text-on-surface-variant">
            {activeJob ? `${activeJob.command.script} / ${t(`releaseConsole.jobStatus.${activeJob.status}`)}` :
              t("releaseConsole.overview.noActiveJob")}
          </div>
        </section>
      </div>
    </section>
  );
}
