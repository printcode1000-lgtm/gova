"use client";

import * as React from "react";

import type { BundleAnalysis, BundleAnalysisComparison } from "@asol/release-core/console";
import { buildJobApiService } from "@/modules/release-commands/services/build-job-api-service";

import { useReleaseJobs } from "./use-release-jobs";

export function useBundleAnalysis() {
  const releaseJobs = useReleaseJobs();
  const [analysis, setAnalysis] = React.useState<BundleAnalysis | null>(null);
  const [comparison, setComparison] = React.useState<BundleAnalysisComparison | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!releaseJobs.authHeaders) return;
    void buildJobApiService.cachedAnalyses(releaseJobs.authHeaders).then((items) => {
      if (items[0]) setAnalysis(items[0]);
    });
  }, [releaseJobs.authHeaders]);
  const analyze = async (jobId: string, name: string) => {
    if (!releaseJobs.authHeaders) return;
    setBusy(true);
    try { setAnalysis(await buildJobApiService.analysis(jobId, name, releaseJobs.authHeaders)); }
    finally { setBusy(false); }
  };
  const compare = async (left: string, right: string) => {
    if (!releaseJobs.authHeaders) return;
    setBusy(true);
    try { setComparison(await buildJobApiService.compare(left, right, releaseJobs.authHeaders)); }
    finally { setBusy(false); }
  };
  return { jobs: releaseJobs.jobs, analysis, comparison, busy, analyze, compare };
}
