"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "@/shared/i18n";
import { useSessionRuntime } from "@/shared/session-runtime";
import {
  EMPTY_STORE_DETAILS,
  type StoreDetailsData,
} from "../../domain/store-details.entity";
import { profileService } from "../../application/services/profile-service";
import { reportSystemIssue } from '@asol/system-logs-core';
import {
  commitSharedStoreName,
  hydrateSharedStoreName,
  readSharedStoreName,
  subscribeSharedStoreName,
  writeSharedStoreName,
} from "./store-name-draft";

const storeDetailsQueryKey = (uid: string) =>
  ["profile", "store-details", uid] as const;

function isStoreDetailsDirty(
  current: StoreDetailsData,
  baseline: StoreDetailsData,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

export function useStoreDetails(
  targetUid?: string,
  initialData?: StoreDetailsData,
  options?: { ignoreStoreNameDirty?: boolean },
) {
  const { t } = useTranslation();
  const { session } = useSessionRuntime();
  const uid = targetUid || session?.uid || "";
  const queryClient = useQueryClient();

  const detailsQuery = useQuery({
    queryKey: storeDetailsQueryKey(uid),
    queryFn: () => profileService.getStoreDetails(uid),
    enabled: Boolean(uid),
    initialData,
  });

  const [details, setDetails] = useState<StoreDetailsData>(EMPTY_STORE_DETAILS);
  const [baseline, setBaseline] =
    useState<StoreDetailsData>(EMPTY_STORE_DETAILS);

  const sharedStoreName = useSyncExternalStore(
    (onChange) => subscribeSharedStoreName(uid, onChange),
    () => readSharedStoreName(uid, details.storeName),
    () => readSharedStoreName(uid, details.storeName),
  );
  const displayedDetails = useMemo(
    () => ({ ...details, storeName: sharedStoreName }),
    [details, sharedStoreName],
  );

  useEffect(() => {
    if (!detailsQuery.data) return;
    hydrateSharedStoreName(uid, detailsQuery.data.storeName);
    setDetails(detailsQuery.data);
    setBaseline(detailsQuery.data);
  }, [detailsQuery.data, uid]);

  useEffect(() => {
    if (detailsQuery.error) {
      reportSystemIssue({
        feature: "Profile",
        operation: "load-store-details",
        error: detailsQuery.error,
      });
    }
  }, [detailsQuery.error]);

  const isDirty = options?.ignoreStoreNameDirty
    ? isStoreDetailsDirty(
        { ...displayedDetails, storeName: baseline.storeName },
        baseline,
      )
    : isStoreDetailsDirty(displayedDetails, baseline);

  const applySaved = useCallback(
    (saved: StoreDetailsData) => {
      queryClient.setQueryData(storeDetailsQueryKey(uid), saved);
      commitSharedStoreName(uid, saved.storeName);
      setDetails(saved);
      setBaseline(saved);
    },
    [queryClient, uid],
  );

  const saveMutation = useMutation({
    mutationFn: async (data: StoreDetailsData) => {
      if (!uid) throw new Error("userNotFound");
      return profileService.saveStoreDetails({ uid, ...data });
    },
    onSuccess: applySaved,
    onError: (error) => {
      reportSystemIssue({
        feature: "Profile",
        operation: "save-store-details",
        error,
      });
    },
  });

  const updateField = useCallback(
    <K extends keyof StoreDetailsData>(
      field: K,
      value: StoreDetailsData[K],
    ) => {
      if (field === "storeName") {
        writeSharedStoreName(uid, value as string);
      }
      setDetails((current) => ({ ...current, [field]: value }));
    },
    [uid],
  );

  const error = useMemo(() => {
    if (detailsQuery.error) return (detailsQuery.error as Error).message;
    if (!saveMutation.error) return null;
    const msg = (saveMutation.error as Error).message;
    if (msg === "userNotFound") return t("auth.validation.userNotFound");
    if (msg === "invalidStoreDetails") {
      return t("profile.validation.invalidStoreDetails");
    }
    return msg;
  }, [detailsQuery.error, saveMutation.error, t]);

  const saveAsync = async () => {
    await saveMutation.mutateAsync(displayedDetails);
    return true;
  };

  return {
    details: displayedDetails,
    updateField,
    isDirty,
    isLoading: (!session && !targetUid) || detailsQuery.isLoading,
    isSaving: saveMutation.isPending,
    error,
    saveAsync,
    applySaved,
    saved: saveMutation.isSuccess && !isDirty,
  };
}
