"use client";

import { useBuildJobs } from "@/modules/release-commands/hooks/use-build-jobs";

import { useAuthHeaders } from "./use-auth-headers";

export function useReleaseJobs() {
  const headers = useAuthHeaders();
  return { ...useBuildJobs(headers), authHeaders: headers };
}
