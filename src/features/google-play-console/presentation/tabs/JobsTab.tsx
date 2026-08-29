"use client";

import { Download, Square } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useAdminArabic } from "@/shared/i18n/use-admin-arabic";
import { useReleaseJobs } from "../hooks/use-release-jobs";
import { LogViewer } from "../components/LogViewer";
import { ReleaseJobStopDialog } from "../components/ReleaseJobStopDialog";
import { uiAttributes } from "@asol/ui-registry-core";

export function JobsTab() {
  const { t } = useAdminArabic();
  const jobs = useReleaseJobs();
  const selected = jobs.jobs.find((job) => job.id === jobs.selectedJobId) ?? jobs.jobs[0];
  return (
    <section {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.section.2-DWG0wo", id: "google-play-console.tabs.jobs-tab.section.2" })} id="google-play-console.tabs.jobs-tab.section" className="grid gap-4 xl:grid-cols-[22rem_1fr]">
      {/* Cancelling is gated by the same confirmation as the build tab. */}
      <ReleaseJobStopDialog id="google-play-console.tabs.jobs-tab.release-job-stop-dialog" job={jobs.pendingCancel} t={t}
        onConfirm={() => void jobs.confirmCancel()} onCancel={jobs.dismissCancel} />
      <div {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.div.7-TjnU5V", id: "google-play-console.tabs.jobs-tab.div.7" })} id="google-play-console.tabs.jobs-tab.div" className="space-y-2 rounded-md border bg-surface p-3">
        {jobs.jobs.map((job) => (
          <button key={job.id} {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.button.2-pGW3ra", id: "google-play-console.tabs.jobs-tab.button.2" })} type="button" onClick={() => jobs.setSelectedJobId(job.id)}
            className="block w-full rounded-md border bg-muted p-3 text-start text-sm">
            <strong {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.strong-B4xFhR", id: "google-play-console.tabs.jobs-tab.strong" })} className="block">{job.command.script}</strong>
            <span {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.span-h7kCHP", id: "google-play-console.tabs.jobs-tab.span" })} className="text-xs text-on-surface-variant">{t(`releaseConsole.jobStatus.${job.status}`)}</span>
          </button>
        ))}
        {!jobs.jobs.length ? <div {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.div.8-WdS1S9", id: "google-play-console.tabs.jobs-tab.div.8" })} id="google-play-console.tabs.jobs-tab.div.2" className="text-sm">{t("releaseConsole.empty")}</div> : null}
      </div>
      <div {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.div.9-Ft5KwP", id: "google-play-console.tabs.jobs-tab.div.9" })} id="google-play-console.tabs.jobs-tab.div.3" className="space-y-3 rounded-md border bg-surface p-3">
        {selected ? <div {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.div.10-rZPXf5", id: "google-play-console.tabs.jobs-tab.div.10" })} id="google-play-console.tabs.jobs-tab.div.4" className="flex justify-between gap-2"><strong {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.strong.2-5iQDra", id: "google-play-console.tabs.jobs-tab.strong.2" })}>{selected.id}</strong>
          {selected.status === "running" || selected.status === "queued" ? (
            <Button id="google-play-console.tabs.jobs-tab.button"
              ui={{
                uid: "release-console.jobs.cancel-27PWNB",
                id: "release-console.jobs.cancel",
                kind: "action",
                action: "cancel-job",
                part: "jobs",
              }} size="sm" variant="outline" onClick={() => void jobs.cancel(selected)}>
              <Square id="google-play-console.tabs.jobs-tab.square" className="h-4 w-4" />{t("releaseConsole.actions.cancel")}
            </Button>
          ) : null}</div> : null}
        {selected?.error ? <div {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.div.11-dML44H", id: "google-play-console.tabs.jobs-tab.div.11" })} id="google-play-console.tabs.jobs-tab.div.5" className="rounded-md bg-error-container p-3 text-on-error-container">
          {selected.error}</div> : null}
        <LogViewer text={jobs.log} emptyText={t("releaseConsole.jobs.noLog")} />
        <div {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.div.12-chEl3S", id: "google-play-console.tabs.jobs-tab.div.12" })} id="google-play-console.tabs.jobs-tab.div.6" className="grid gap-2 md:grid-cols-2">
          {(selected?.artifacts ?? []).map((artifact) => (
            <a key={artifact.name} {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.a-2SzruY", id: "google-play-console.tabs.jobs-tab.a" })} className="flex gap-2 rounded-md border p-2 text-xs"
              href={`/api/super-admin/build-jobs/${selected.id}/artifacts/${encodeURIComponent(artifact.name)}`}>
              <Download className="h-4 w-4" /><span {...uiAttributes({ uid: "google-play-console.tabs.jobs-tab.span.2-lW2HHS", id: "google-play-console.tabs.jobs-tab.span.2" })} className="truncate">{artifact.path}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
