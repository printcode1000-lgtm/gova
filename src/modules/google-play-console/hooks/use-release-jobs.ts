"use client";

import * as React from "react";

import type { StartBuildJobInput } from "@/modules/release-commands/domain/build-job-types";
import { useBuildJobs } from "@/modules/release-commands/hooks/use-build-jobs";

import { useAuthHeaders } from "./use-auth-headers";

/**
 * Release console jobs with two page-wide guarantees:
 *
 * 1. Every command start is gated behind an explicit confirmation — `start`
 *    only records the request, and `confirmStart` is what actually runs it.
 * 2. `locked` is true while any job is queued or running, so every execute
 *    button on the page can disable itself and no two commands overlap.
 *
 * Both live in this hook rather than in the buttons, so a new call site cannot
 * accidentally bypass them.
 */
export function useReleaseJobs() {
  const headers = useAuthHeaders();
  const jobs = useBuildJobs(headers);
  const [pending, setPending] = React.useState<StartBuildJobInput | null>(null);

  const activeJob = jobs.jobs.find((job) => job.status === "queued" || job.status === "running");
  const locked = jobs.busy || Boolean(activeJob);
  const realStart = jobs.start;

  const start = React.useCallback(async (input: StartBuildJobInput) => {
    setPending(input);
    return null;
  }, []);

  const confirmStart = React.useCallback(async (overrides?: Partial<StartBuildJobInput>) => {
    // `locked` is re-checked here: a job may have started while the dialog was open.
    if (!pending || locked) return null;
    setPending(null);
    return realStart({ ...pending, ...overrides });
  }, [locked, pending, realStart]);

  const dismissStart = React.useCallback(() => setPending(null), []);

  return {
    ...jobs, authHeaders: headers,
    start, activeJob, locked, pending, confirmStart, dismissStart,
  };
}
