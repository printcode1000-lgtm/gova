"use client";

import { ASOL_QUERY_POLICIES, useQueries } from "@asol/data-core/browser";
import { profileService } from "../../application/services/profile-service";

export function useProfileCarrierLabels(uids: string[]) {
  const uniqueUids = [...new Set(uids.filter(Boolean))];
  const queries = useQueries({
    queries: uniqueUids.map((uid) => ({
      queryKey: ["profile", "store-details", uid] as const,
      queryFn: () => profileService.getStoreDetails(uid),
      ...ASOL_QUERY_POLICIES.localFirst,
    })),
  });

  return uniqueUids.flatMap((uid, index) => {
    const label = queries[index]?.data?.storeName?.trim();
    return label ? [{ uid, label }] : [];
  });
}
