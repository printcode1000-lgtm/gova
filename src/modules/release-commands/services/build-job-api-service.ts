import { asolApi } from "@/core/api";

import type { BuildCommandCatalogEntry } from "@asol/release-core/console";
import type { BundleAnalysis, BundleAnalysisComparison } from "@asol/release-core/console";
import type { BuildArtifactDescriptor, BuildCommandReadiness, BuildJobRecord, PaginatedBuildJobs, ReleaseVersionSnapshot, StartBuildJobInput } from "@asol/release-core/console";

export const BUILD_JOBS_API = "/api/super-admin/build-jobs";
export interface BuildCommandCatalogResponse {
  catalog: readonly BuildCommandCatalogEntry[];
  readiness: BuildCommandReadiness[];
  versions: ReleaseVersionSnapshot;
}

export const buildJobApiService = {
  list(page = 1, headers?: Record<string, string>) { return asolApi.get<PaginatedBuildJobs>(`${BUILD_JOBS_API}?page=${page}&pageSize=20`, { headers, cache: "no-store" }); },
  catalog(headers?: Record<string, string>) { return asolApi.get<BuildCommandCatalogResponse>(`${BUILD_JOBS_API}/catalog`, { headers, cache: "no-store" }); },
  start(input: StartBuildJobInput, headers?: Record<string, string>) { return asolApi.post<BuildJobRecord>(BUILD_JOBS_API, input, { headers }); },
  cancel(jobId: string, headers?: Record<string, string>) { return asolApi.post<BuildJobRecord>(`${BUILD_JOBS_API}/${jobId}/cancel`, {}, { headers }); },
  // Polled twice a second while a job runs, and a queued job has no log file
  // yet: `releaseJobLogNotFound` is the normal answer for the first seconds,
  // not a fault. The caller already swallows it, but the client logged every
  // rejection, so waiting for a job to start filled the log with errors.
  log(jobId: string, offset: number, headers?: Record<string, string>) { return asolApi.get<{ text: string; nextOffset: number; hasMore: boolean }>(`${BUILD_JOBS_API}/${jobId}/log?offset=${offset}`, { headers, cache: "no-store", suppressErrorLog: true }); },
  artifacts(jobId: string, headers?: Record<string, string>) { return asolApi.get<BuildArtifactDescriptor[]>(`${BUILD_JOBS_API}/${jobId}/artifacts`, { headers, cache: "no-store" }); },
  cachedAnalyses(headers?: Record<string, string>) { return asolApi.get<BundleAnalysis[]>(`${BUILD_JOBS_API}/analysis`, { headers, cache: "no-store" }); },
  analysis(jobId: string, name: string, headers?: Record<string, string>) { return asolApi.get<BundleAnalysis>(`${BUILD_JOBS_API}/${jobId}/artifacts/${encodeURIComponent(name)}/analysis`, { headers, cache: "no-store" }); },
  compare(left: string, right: string, headers?: Record<string, string>) { return asolApi.get<BundleAnalysisComparison>(`${BUILD_JOBS_API}/analysis/compare?left=${encodeURIComponent(left)}&right=${encodeURIComponent(right)}`, { headers, cache: "no-store" }); },
};
