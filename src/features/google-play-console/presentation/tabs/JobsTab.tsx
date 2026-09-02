"use client";

import { Download, Square } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useReleaseJobs } from "../hooks/use-release-jobs";
import { LogViewer } from "../components/LogViewer";
import { ReleaseJobStopDialog } from "../components/ReleaseJobStopDialog";

export function JobsTab() {
  const { t } = useAdminArabic();
  const jobs = useReleaseJobs();
  const selected = jobs.jobs.find((job) => job.id === jobs.selectedJobId) ?? jobs.jobs[0];
  return (
    <section id='google-play-console-presentation-tabs-jobstab-section-1-raw5gn' className="grid gap-4 xl:grid-cols-[22rem_1fr]">
      {/* Cancelling is gated by the same confirmation as the build tab. */}
      <ReleaseJobStopDialog
        id='google-play-console-presentation-tabs-jobstab-releasejobstopdialog-2-bsqpsz'
        job={jobs.pendingCancel}
        t={t}
        onConfirm={() => void jobs.confirmCancel()}
        onCancel={jobs.dismissCancel}
      />
      <div id='google-play-console-presentation-tabs-jobstab-div-3-sjwpdy' className="space-y-2 rounded-md border bg-surface p-3">
        {jobs.jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => jobs.setSelectedJobId(job.id)}
            className="block w-full rounded-md border bg-muted p-3 text-start text-sm"
          >
            <strong className="block">{job.command.script}</strong>
            <span className="text-xs text-on-surface-variant">{t(`releaseConsole.jobStatus.${job.status}`)}</span>
          </button>
        ))}
        {!jobs.jobs.length ? (
          <div id='google-play-console-presentation-tabs-jobstab-div-4-ylxmfl' className="text-sm">
            {t("releaseConsole.empty")}
          </div>
        ) : null}
      </div>
      <div id='google-play-console-presentation-tabs-jobstab-div-5-c5zc9d' className="space-y-3 rounded-md border bg-surface p-3">
        {selected ? (
          <div id='google-play-console-presentation-tabs-jobstab-div-6-tyuzwb' className="flex justify-between gap-2">
            <strong id="google-play-console-presentation-tabs-jobstab-strong-7-sqz5uo">{selected.id}</strong>
            {selected.status === "running" || selected.status === "queued" ? (
              <Button
                id='google-play-console-presentation-tabs-jobstab-button-8-homrx6'
                size="sm"
                variant="outline"
                onClick={() => void jobs.cancel(selected)}
              >
                <Square id='google-play-console-presentation-tabs-jobstab-square-9-bohgr4' className="h-4 w-4" />
                {t("releaseConsole.actions.cancel")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {selected?.error ? (
          <div
            id='google-play-console-presentation-tabs-jobstab-div-10-8vedvi'
            className="rounded-md bg-error-container p-3 text-on-error-container"
          >
            {selected.error}
          </div>
        ) : null}
        <LogViewer text={jobs.log} emptyText={t("releaseConsole.jobs.noLog")} />
        <div id='google-play-console-presentation-tabs-jobstab-div-11-btqvfh' className="grid gap-2 md:grid-cols-2">
          {(selected?.artifacts ?? []).map((artifact) => (
            <a
              key={artifact.name}
              className="flex gap-2 rounded-md border p-2 text-xs"
              href={`/api/super-admin/build-jobs/${selected.id}/artifacts/${encodeURIComponent(artifact.name)}`}
            >
              <Download className="h-4 w-4" />
              <span className="truncate">{artifact.path}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
