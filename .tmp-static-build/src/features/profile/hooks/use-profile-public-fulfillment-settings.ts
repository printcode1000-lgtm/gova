"use client";

import { useQuery } from "@tanstack/react-query";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  normalizeProfileFulfillmentSettings,
} from "../entities/profile-fulfillment-settings.entity";
import { profileService } from "../services/profile-service";

export const profileFulfillmentSettingsQueryKey = (uid: string) =>
  ["profile", "fulfillment-settings", uid] as const;

export function useProfilePublicFulfillmentSettings(uid: string) {
  const query = useQuery({
    queryKey: profileFulfillmentSettingsQueryKey(uid),
    queryFn: () => profileService.getFulfillmentSettings(uid),
    enabled: Boolean(uid),
    staleTime: 0,
    refetchOnMount: "always",
  });

  return {
    settings: query.data
      ? normalizeProfileFulfillmentSettings(query.data)
      : EMPTY_PROFILE_FULFILLMENT_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
