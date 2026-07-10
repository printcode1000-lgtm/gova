'use client';

import { useQuery } from '@tanstack/react-query';
import { profileApiService } from '../services/profile-api-service';

const usersBySpecialtyQueryKey = (
  categoryId: number,
  subcategoryId: number,
  offset: number,
  limit: number,
  search: string,
) => ['users', 'specialty', categoryId, subcategoryId, offset, limit, search] as const;

export function useUsersBySpecialty(
  categoryId: number,
  subcategoryId: number,
  offset: number = 0,
  limit: number = 10,
  search: string = "",
) {
  return useQuery({
    queryKey: usersBySpecialtyQueryKey(categoryId, subcategoryId, offset, limit, search),
    queryFn: () => profileApiService.getUsersBySpecialty(categoryId, subcategoryId, offset, limit, search),
    enabled: Boolean(categoryId) && Boolean(subcategoryId),
  });
}
