'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useSession } from '@/features/auth/components/SessionProvider';
import type { SaveStoreImagesInput, StoreImagesData } from '../entities/store-images.entity';
import { profileService } from '../services/profile-service';
import { reportSystemIssue } from '@/features/system-logs/report-system-issue';

const profileStoreImagesQueryKey = (uid: string) => ['profile', 'store-images', uid] as const;

const emptyStoreImages: StoreImagesData = {
  avatarImageKey: null,
  coverImageKey: null,
  coverImageKeys: [],
  avatarUrl: null,
  coverUrl: null,
  coverUrls: [],
};

export function useProfileStoreImages(targetUid?: string) {
  const { session } = useSession();
  const uid = targetUid || session?.uid || '';
  const queryClient = useQueryClient();

  const storeImagesQuery = useQuery({
    queryKey: profileStoreImagesQueryKey(uid),
    queryFn: () => profileService.getStoreImages(uid),
    enabled: Boolean(uid),
    meta: {
      feature: 'Profile',
      page: '/profile',
      component: 'StoreIdentityCard',
      hook: 'useProfileStoreImages',
      service: 'ProfileApiService.getStoreImages',
      queryOrCommand: 'GetProfileImageKeysQuery',
      repository: 'ProfileRepository',
      table: 'user_profiles',
      entity: 'StoreImages',
    },
  });

  useEffect(() => {
    if (storeImagesQuery.error) {
      reportSystemIssue({ feature: 'Profile', operation: 'load-store-images', error: storeImagesQuery.error });
    }
  }, [storeImagesQuery.error]);

  const saveMutation = useMutation({
    mutationFn: async (input: Omit<SaveStoreImagesInput, 'uid'>) => {
      if (!uid) throw new Error('userNotFound');
      return profileService.saveStoreImages({ uid, ...input });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(profileStoreImagesQueryKey(uid), saved);
    },
    onError: (error) => {
      reportSystemIssue({ feature: 'Profile', operation: 'save-store-images', error });
    },
    meta: {
      feature: 'Profile',
      component: 'StoreIdentityCard',
      hook: 'useProfileStoreImages',
      service: 'ProfileApiService.saveStoreImages',
      queryOrCommand: 'UpsertProfileImageKeysCommand',
      repository: 'ProfileRepository',
      table: 'user_profiles',
      entity: 'StoreImages',
      operationType: 'UPDATE',
    },
  });

  const error = useMemo(() => {
    const currentError = storeImagesQuery.error ?? saveMutation.error;
    return currentError instanceof Error ? currentError.message : null;
  }, [saveMutation.error, storeImagesQuery.error]);

  return {
    storeImages: storeImagesQuery.data ?? emptyStoreImages,
    isLoading: storeImagesQuery.isLoading,
    isSaving: saveMutation.isPending,
    error,
    saveStoreImages: saveMutation.mutateAsync,
  };
}
