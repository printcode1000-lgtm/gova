import { asolApi } from "@/core/api";

import type { BuildArtifactDescriptor, BuildJobRecord, StartBuildJobInput } from "../domain/build-job-types";
import type { BUILD_COMMAND_CATALOG } from "../domain/build-command-catalog";

export const BUILD_JOBS_API = "/api/super-admin/build-jobs";

export interface BuildJobsListResponse {
  catalog: typeof BUILD_COMMAND_CATALOG;
  jobs: BuildJobRecord[];
}

export const buildJobApiService = {
  list(headers?: Record<string, string>) {
    return asolApi.get<BuildJobsListResponse>(BUILD_JOBS_API, { headers, cache: "no-store" });
  },
  start(input: StartBuildJobInput, headers?: Record<string, string>) {
    return asolApi.post<BuildJobRecord>(BUILD_JOBS_API, input, { headers });
  },
  cancel(jobId: string, headers?: Record<string, string>) {
    return asolApi.post<BuildJobRecord>(`${BUILD_JOBS_API}/${jobId}/cancel`, {}, { headers });
  },
  log(jobId: string, offset: number, headers?: Record<string, string>) {
    return asolApi.get<{ offset: number; text: string }>(`${BUILD_JOBS_API}/${jobId}/log?offset=${offset}`, { headers, cache: "no-store" });
  },
  artifacts(jobId: string, headers?: Record<string, string>) {
    return asolApi.get<BuildArtifactDescriptor[]>(`${BUILD_JOBS_API}/${jobId}/artifacts`, { headers, cache: "no-store" });
  },
};
