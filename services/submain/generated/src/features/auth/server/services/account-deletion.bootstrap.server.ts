import 'server-only';

import { AccountDeletionService } from '@asol/auth-core/server';
import { accountDeletionRepository } from '@asol/data-core/account-deletion';
import { imageStorageService } from '@/features/storage/server';

/** Account deletion composition only; no auth session, user, or profile bootstrap. */
export const accountDeletionService = new AccountDeletionService(
  accountDeletionRepository,
  {
    deleteImage: (profileId, key) =>
      imageStorageService.deleteImage(profileId, key),
  },
);
