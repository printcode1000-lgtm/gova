"use client";

import { Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BuildJobRecord } from "@/modules/release-commands/domain/build-job-types";
import { formatBytes, formatDate } from "./console-utils";

export function JobsLogTab({
  jobs,
  selectedJobId,
  log,
  t,
  onSelect,
  onCancel,
}: {
  jobs: BuildJobRecord[];
  selectedJobId: string;
  log: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSelect: (jobId: string) => void;
  onCancel: (job: BuildJobRecord) => void;
}) {
  const selected = jobs.find((job) => job.id === selectedJobId) ?? jobs[0];
  return (
    <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <div className="space-y-2 rounded-md border bg-surface p-3">
        {jobs.map((job) => (
          <button key={job.id} type="button" onClick={() => onSelect(job.id)} className="block w-full rounded-md border bg-muted p-3 text-start text-sm">
            <span className="block font-semibold">{job.command.script}</span>
            <span className="block text-xs text-on-surface-variant">{job.status} - {formatDate(job.startedAt ?? job.queuedAt)}</span>
          </button>
        ))}
        {!jobs.length ? <div className="text-sm text-on-surface-variant">{t("releaseConsole.empty")}</div> : null}
      </div>
      <div className="space-y-3 rounded-md border bg-surface p-3">
        {selected ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">{selected.id}</div>
            {selected.status === "running" ? <Button type="button" variant="outline" size="sm" onClick={() => onCancel(selected)}><Square className="h-4 w-4" />{t("releaseConsole.actions.cancel")}</Button> : null}
          </div>
        ) : null}
        <pre className="min-h-80 max-h-[520px] overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">{log || selected?.error || ""}</pre>
        <div className="grid gap-2 md:grid-cols-2">
          {(selected?.artifacts ?? []).map((artifact) => (
            <a key={artifact.name} className="rounded-md border bg-muted p-2 text-xs" href={`/api/super-admin/build-jobs/${selected?.id}/artifacts/${artifact.name}`}>
              <span className="block truncate">{artifact.path}</span>
              <span className="text-on-surface-variant">{formatBytes(artifact.size)} - {artifact.sha256.slice(0, 12)}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
