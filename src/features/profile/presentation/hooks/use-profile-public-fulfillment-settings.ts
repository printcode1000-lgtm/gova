"use client";

import { useQuery } from "@asol/data-core/browser";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  normalizeProfileFulfillmentSettings,
} from "../../domain/profile-fulfillment-settings.entity";
import { profileService } from "../../application/services/profile-service";

export const profileFulfillmentSettingsQueryKey = (uid: string) =>
  ["profile", "fulfillment-settings", uid] as const;

export function useProfilePublicFulfillmentSettings(uid: string) {
  const query = useQuery({
    queryKey: profileFulfillmentSettingsQueryKey(uid),
    queryFn: () => profileService.getFulfillmentSettings(uid),
    enabled: Boolean(uid),
  });

  return {
    settings: query.data
      ? normalizeProfileFulfillmentSettings(query.data)
      : EMPTY_PROFILE_FULFILLMENT_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
