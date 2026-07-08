'use client';

import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profile-service';
import type { UserProfileRow } from '@/core/database/profile/profile.schema';

const usersBySpecialtyQueryKey = (columnName: string, offset: number, limit: number) =>
  ['users', 'specialty', columnName, offset, limit] as const;

export function useUsersBySpecialty(columnName: string, offset: number = 0, limit: number = 10) {
  return useQuery({
    queryKey: usersBySpecialtyQueryKey(columnName, offset, limit),
    queryFn: () => profileService.getUsersBySpecialty(columnName, offset, limit),
    enabled: Boolean(columnName),
  });
}
