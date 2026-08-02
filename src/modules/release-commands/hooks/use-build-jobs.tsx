"use client";

import * as React from "react";

import { buildJobApiService, type BuildJobsListResponse } from "../services/build-job-api-service";
import type { BuildJobRecord, StartBuildJobInput } from "../domain/build-job-types";

export function useBuildJobs(headers?: Record<string, string>) {
  const [data, setData] = React.useState<BuildJobsListResponse | null>(null);
  const [selectedJobId, setSelectedJobId] = React.useState<string>("");
  const [log, setLog] = React.useState("");
  const [logOffset, setLogOffset] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!headers) return;
    setData(await buildJobApiService.list(headers));
  }, [headers]);

  React.useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  React.useEffect(() => {
    if (!headers || !selectedJobId) return;
    const interval = window.setInterval(async () => {
      const next = await buildJobApiService.log(selectedJobId, logOffset, headers);
      if (next.text) setLog((current) => current + next.text);
      setLogOffset(next.offset);
    }, 1500);
    return () => window.clearInterval(interval);
  }, [headers, logOffset, selectedJobId]);

  const start = React.useCallback(async (input: StartBuildJobInput) => {
    if (!headers) return null;
    setBusy(true);
    try {
      const job = await buildJobApiService.start(input, headers);
      setSelectedJobId(job.id);
      setLog("");
      setLogOffset(0);
      await refresh();
      return job;
    } finally {
      setBusy(false);
    }
  }, [headers, refresh]);

  const cancel = React.useCallback(async (job: BuildJobRecord) => {
    if (!headers) return;
    await buildJobApiService.cancel(job.id, headers);
    await refresh();
  }, [headers, refresh]);

  return {
    catalog: data?.catalog ?? [],
    jobs: data?.jobs ?? [],
    selectedJobId,
    setSelectedJobId: (jobId: string) => {
      setSelectedJobId(jobId);
      setLog("");
      setLogOffset(0);
    },
    log,
    busy,
    start,
    cancel,
    refresh,
  };
}
