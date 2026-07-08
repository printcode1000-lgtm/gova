'use client';

import { useQuery } from '@tanstack/react-query';
import { profileApiService } from '../services/profile-api-service';

const usersBySpecialtyQueryKey = (categoryId: number, subcategoryId: number, offset: number, limit: number) =>
  ['users', 'specialty', categoryId, subcategoryId, offset, limit] as const;

export function useUsersBySpecialty(categoryId: number, subcategoryId: number, offset: number = 0, limit: number = 10) {
  return useQuery({
    queryKey: usersBySpecialtyQueryKey(categoryId, subcategoryId, offset, limit),
    queryFn: () => profileApiService.getUsersBySpecialty(categoryId, subcategoryId, offset, limit),
    enabled: Boolean(categoryId) && Boolean(subcategoryId),
  });
}
