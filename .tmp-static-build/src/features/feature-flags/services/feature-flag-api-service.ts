"use client";

import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import type { RemoteFeatureFlagValues } from "../types";

export interface FeatureFlagAdminEntry {
  key: string;
  description: string;
  capability?: string;
  defaultEnabled: boolean;
  enabled: boolean;
  notes: string;
  updatedAt?: string;
  updatedByUid?: string;
  usingDefault: boolean;
}

export const featureFlagApiService = {
  /**
   * Flag values for the running client.
   *
   * Errors are not logged: a device that cannot reach the server keeps its last
   * known values, and a failed refresh is an expected offline state rather than
   * an incident.
   */
  getValues: () =>
    asolApi.get<RemoteFeatureFlagValues>(ASOL_API_ROUTES.featureFlags, {
      suppressErrorLog: true,
    }),

  listForAdmin: (identity: { uid: string; phone: string }) => {
    const query = new URLSearchParams({
      uid: identity.uid,
      phone: identity.phone,
    });
    return asolApi.get<FeatureFlagAdminEntry[]>(
      `${ASOL_API_ROUTES.featureFlags}?${query}`,
    );
  },

  setFlag: (input: {
    identity: { uid: string; phone: string };
    key: string;
    enabled: boolean;
    notes?: string;
  }) => asolApi.put<FeatureFlagAdminEntry>(ASOL_API_ROUTES.featureFlags, input),
};
