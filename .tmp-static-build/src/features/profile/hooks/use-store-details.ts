'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSession } from '@/features/auth/components/SessionProvider';
import {
  EMPTY_STORE_DETAILS,
  type StoreDetailsData,
} from '../entities/store-details.entity';
import { profileService } from '../services/profile-service';
import { reportSystemIssue } from '@/features/system-logs/report-system-issue';

const storeDetailsQueryKey = (uid: string) =>
  ['profile', 'store-details', uid] as const;

function isStoreDetailsDirty(
  current: StoreDetailsData,
  baseline: StoreDetailsData,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

export function useStoreDetails(targetUid?: string) {
  const { t } = useTranslation();
  const { session } = useSession();
  const uid = targetUid || session?.uid || '';
  const queryClient = useQueryClient();

  const detailsQuery = useQuery({
    queryKey: storeDetailsQueryKey(uid),
    queryFn: () => profileService.getStoreDetails(uid),
    enabled: Boolean(uid),
  });

  const [details, setDetails] = useState<StoreDetailsData>(EMPTY_STORE_DETAILS);
  const [baseline, setBaseline] =
    useState<StoreDetailsData>(EMPTY_STORE_DETAILS);

  useEffect(() => {
    if (!detailsQuery.data) return;
    setDetails(detailsQuery.data);
    setBaseline(detailsQuery.data);
  }, [detailsQuery.data]);

  useEffect(() => {
    if (detailsQuery.error) {
      reportSystemIssue({ feature: 'Profile', operation: 'load-store-details', error: detailsQuery.error });
    }
  }, [detailsQuery.error]);

  const isDirty = isStoreDetailsDirty(details, baseline);

  const applySaved = useCallback(
    (saved: StoreDetailsData) => {
      queryClient.setQueryData(storeDetailsQueryKey(uid), saved);
      setDetails(saved);
      setBaseline(saved);
    },
    [queryClient, uid],
  );

  const saveMutation = useMutation({
    mutationFn: async (data: StoreDetailsData) => {
      if (!uid) throw new Error('userNotFound');
      return profileService.saveStoreDetails({ uid, ...data });
    },
    onSuccess: applySaved,
    onError: (error) => {
      reportSystemIssue({ feature: 'Profile', operation: 'save-store-details', error });
    },
  });

  const updateField = useCallback(
    <K extends keyof StoreDetailsData>(
      field: K,
      value: StoreDetailsData[K],
    ) => {
      setDetails((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const error = useMemo(() => {
    if (detailsQuery.error) return (detailsQuery.error as Error).message;
    if (!saveMutation.error) return null;
    const msg = (saveMutation.error as Error).message;
    if (msg === 'userNotFound') return t('auth.validation.userNotFound');
    if (msg === 'invalidStoreDetails') {
      return t('profile.validation.invalidStoreDetails');
    }
    return msg;
  }, [detailsQuery.error, saveMutation.error, t]);

  const saveAsync = async () => {
    await saveMutation.mutateAsync(details);
    return true;
  };

  const save = () => {
    void saveAsync();
  };

  return {
    details,
    updateField,
    isDirty,
    isLoading: !session && !targetUid || detailsQuery.isLoading,
    isSaving: saveMutation.isPending,
    error,
    save,
    saveAsync,
    applySaved,
    saved: saveMutation.isSuccess && !isDirty,
  };
}
