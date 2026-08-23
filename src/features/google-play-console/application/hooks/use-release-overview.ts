"use client";

import { useBuildJobs } from "@/features/release-commands/ui";

import { useAuthHeaders } from "./use-auth-headers";
import { useStoreAssets } from "./use-store-assets";

export function useReleaseOverview() {
  const headers = useAuthHeaders();
  const assets = useStoreAssets();
  const buildJobs = useBuildJobs(headers);
  return { snapshot: assets.snapshot, jobs: buildJobs.jobs };
}
