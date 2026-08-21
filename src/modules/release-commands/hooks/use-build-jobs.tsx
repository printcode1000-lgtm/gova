"use client";

import * as React from "react";

import type { BuildCommandCatalogEntry } from "@asol/release-core/console";
import type { BuildCommandReadiness, BuildJobRecord, ReleaseVersionSnapshot, StartBuildJobInput } from "@asol/release-core/console";
import { buildJobApiService } from "../services/build-job-api-service";

export function useBuildJobs(headers?: Record<string, string>) {
  const [catalog, setCatalog] = React.useState<readonly BuildCommandCatalogEntry[]>([]);
  const [readiness, setReadiness] = React.useState<BuildCommandReadiness[]>([]);
  const [versions, setVersions] = React.useState<ReleaseVersionSnapshot>({});
  const [jobs, setJobs] = React.useState<BuildJobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = React.useState("");
  const [log, setLog] = React.useState("");
  const [logOffset, setLogOffset] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [startError, setStartError] = React.useState("");
  /**
   * The release console spawns local build processes, so the server refuses it
   * outside development. That is a permanent answer, not a failure: once seen,
   * polling stops. It used to retry every five seconds forever, and because
   * `void promise` discards the value without handling rejection, each attempt
   * surfaced as an unhandled rejection on the device.
   */
  const [unavailable, setUnavailable] = React.useState(false);
  const refreshSequence = React.useRef(0);
  const appliedRefreshSequence = React.useRef(0);

  const handle = React.useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "googlePlayConsoleDevelopmentOnly") {
      setUnavailable(true);
      return;
    }
    // The API client already records unexpected responses. Polling retries here
    // without duplicating the same issue in the system log.
  }, []);

  const refresh = React.useCallback(async () => {
    if (!headers) return;
    const sequence = ++refreshSequence.current;
    const nextJobs = (await buildJobApiService.list(1, headers)).jobs;
    if (sequence < appliedRefreshSequence.current) return;
    appliedRefreshSequence.current = sequence;
    setJobs(nextJobs);
    setSelectedJobId((current) => current || nextJobs[0]?.id || "");
  }, [headers]);

  React.useEffect(() => {
    if (!headers || unavailable) return;
    buildJobApiService
      .catalog(headers)
      .then((data) => {
        setCatalog(data.catalog);
        setReadiness(data.readiness);
        setVersions(data.versions);
      })
      .catch(handle);
  }, [headers, unavailable, handle]);

  const active = jobs.some((job) => job.status === "queued" || job.status === "running");
  React.useEffect(() => {
    if (unavailable) return;
    let cancelled = false;
    let timer = 0;
    const run = async () => {
      try { await refresh(); } catch (error) { handle(error); }
      if (!cancelled) timer = window.setTimeout(run, active ? 1_000 : 5_000);
    };
    void run();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [refresh, unavailable, handle, active]);

  React.useEffect(() => {
    if (!headers || !selectedJobId) return;
    let cancelled = false;
    const drain = async () => {
      try {
        let offset = logOffset;
        let hasMore = true;
        while (!cancelled && hasMore) {
          const next = await buildJobApiService.log(selectedJobId, offset, headers);
          if (next.text) setLog((current) => current + next.text);
          offset = next.nextOffset;
          hasMore = next.hasMore;
        }
        if (!cancelled) setLogOffset(offset);
      } catch { /* A queued job may not have created its log yet. */ }
    };
    void drain();
    const interval = window.setInterval(() => void drain(), 1500);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [headers, logOffset, selectedJobId]);

  const start = React.useCallback(async (input: StartBuildJobInput) => {
    if (!headers) return null;
    setBusy(true);
    setStartError("");
    try {
      const job = await buildJobApiService.start(input, headers);
      setSelectedJobId(job.id); setLog(""); setLogOffset(0); await refresh(); return job;
    } catch (error) {
      setStartError(error instanceof Error ? error.message : String(error));
      return null;
    } finally { setBusy(false); }
  }, [headers, refresh]);

  const cancel = React.useCallback(async (job: BuildJobRecord) => {
    if (!headers) return;
    await buildJobApiService.cancel(job.id, headers); await refresh();
  }, [headers, refresh]);

  const clearLog = React.useCallback(() => {
    setLog("");
    setLogOffset(0);
  }, []);

  return { catalog, readiness, versions, jobs, selectedJobId, setSelectedJobId: (jobId: string) => { setSelectedJobId(jobId); setLog(""); setLogOffset(0); }, log, clearLog, busy, startError, start, cancel, refresh, unavailable };
}
