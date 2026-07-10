"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/features/auth/components/SessionProvider";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  type ProfileFulfillmentSettings,
} from "../entities/profile-fulfillment-settings.entity";
import { profileService } from "../services/profile-service";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";

const fulfillmentSettingsQueryKey = (uid: string) =>
  ["profile", "fulfillment-settings", uid] as const;

function isDirty(
  current: ProfileFulfillmentSettings,
  baseline: ProfileFulfillmentSettings,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

export function useProfileFulfillmentSettings() {
  const { session } = useSession();
  const uid = session?.uid ?? "";
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: fulfillmentSettingsQueryKey(uid),
    queryFn: () => profileService.getFulfillmentSettings(uid),
    enabled: Boolean(uid),
  });

  const [settings, setSettings] = useState<ProfileFulfillmentSettings>(
    EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  );
  const [baseline, setBaseline] = useState<ProfileFulfillmentSettings>(
    EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  );

  useEffect(() => {
    if (!settingsQuery.data) return;
    setSettings(settingsQuery.data);
    setBaseline(settingsQuery.data);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (settingsQuery.error) {
      reportSystemIssue({
        feature: "Profile",
        operation: "load-fulfillment-settings",
        error: settingsQuery.error,
      });
    }
  }, [settingsQuery.error]);

  const dirty = isDirty(settings, baseline);

  const applySaved = useCallback(
    (saved: ProfileFulfillmentSettings) => {
      queryClient.setQueryData(fulfillmentSettingsQueryKey(uid), saved);
      setSettings(saved);
      setBaseline(saved);
    },
    [queryClient, uid],
  );

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileFulfillmentSettings) => {
      if (!uid) throw new Error("userNotFound");
      return profileService.saveFulfillmentSettings({ uid, ...data });
    },
    onSuccess: applySaved,
    onError: (error) => {
      reportSystemIssue({
        feature: "Profile",
        operation: "save-fulfillment-settings",
        error,
      });
    },
  });

  const updateSettings = useCallback(
    (updater: (current: ProfileFulfillmentSettings) => ProfileFulfillmentSettings) => {
      setSettings(updater);
    },
    [],
  );

  const error = useMemo(() => {
    const currentError = settingsQuery.error ?? saveMutation.error;
    return currentError instanceof Error ? currentError.message : null;
  }, [saveMutation.error, settingsQuery.error]);

  const saveAsync = async () => {
    await saveMutation.mutateAsync(settings);
    return true;
  };

  return {
    settings,
    updateSettings,
    isDirty: dirty,
    isLoading: !session || settingsQuery.isLoading,
    isSaving: saveMutation.isPending,
    error,
    saveAsync,
    applySaved,
    saved: saveMutation.isSuccess && !dirty,
  };
}
