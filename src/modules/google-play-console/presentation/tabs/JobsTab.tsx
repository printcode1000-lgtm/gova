"use client";

import { Download, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { useReleaseJobs } from "../../hooks/use-release-jobs";
import { LogViewer } from "../components/LogViewer";

export function JobsTab() {
  const { t } = useTranslation();
  const jobs = useReleaseJobs();
  const selected = jobs.jobs.find((job) => job.id === jobs.selectedJobId) ?? jobs.jobs[0];
  return (
    <section className="grid gap-4 xl:grid-cols-[22rem_1fr]">
      <div className="space-y-2 rounded-md border bg-surface p-3">
        {jobs.jobs.map((job) => (
          <button key={job.id} type="button" onClick={() => jobs.setSelectedJobId(job.id)}
            className="block w-full rounded-md border bg-muted p-3 text-start text-sm">
            <strong className="block">{job.command.script}</strong>
            <span className="text-xs text-on-surface-variant">{t(`releaseConsole.jobStatus.${job.status}`)}</span>
          </button>
        ))}
        {!jobs.jobs.length ? <div className="text-sm">{t("releaseConsole.empty")}</div> : null}
      </div>
      <div className="space-y-3 rounded-md border bg-surface p-3">
        {selected ? <div className="flex justify-between gap-2"><strong>{selected.id}</strong>
          {selected.status === "running" || selected.status === "queued" ? (
            <Button size="sm" variant="outline" onClick={() => void jobs.cancel(selected)}>
              <Square className="h-4 w-4" />{t("releaseConsole.actions.cancel")}
            </Button>
          ) : null}</div> : null}
        {selected?.error ? <div className="rounded-md bg-error-container p-3 text-on-error-container">
          {selected.error}</div> : null}
        <LogViewer text={jobs.log} emptyText={t("releaseConsole.jobs.noLog")} />
        <div className="grid gap-2 md:grid-cols-2">
          {(selected?.artifacts ?? []).map((artifact) => (
            <a key={artifact.name} className="flex gap-2 rounded-md border p-2 text-xs"
              href={`/api/super-admin/build-jobs/${selected.id}/artifacts/${encodeURIComponent(artifact.name)}`}>
              <Download className="h-4 w-4" /><span className="truncate">{artifact.path}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
