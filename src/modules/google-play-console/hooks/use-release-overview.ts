"use client";

import { useBuildJobs } from "@/modules/release-commands/hooks/use-build-jobs";

import { useAuthHeaders } from "./use-auth-headers";
import { useStoreAssets } from "./use-store-assets";

export function useReleaseOverview() {
  const headers = useAuthHeaders();
  const assets = useStoreAssets();
  const buildJobs = useBuildJobs(headers);
  return { snapshot: assets.snapshot, jobs: buildJobs.jobs };
}
