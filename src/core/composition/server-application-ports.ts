import 'server-only';

import { registerPharmacyCatalogProductLookupPort } from '@/features/pharmacy-profile-catalog/server';
import { registerReviewerAvatarPort } from '@/features/product/server';
import { profileService } from '@/features/profile/server';

export function registerServerApplicationPorts(): void {
  registerPharmacyCatalogProductLookupPort();
  registerReviewerAvatarPort({
    getAvatarUrl: async (uid) => {
      const images = await profileService.getStoreImages(uid);
      return images.avatarUrl;
    },
    getDisplayName: async (uid) => {
      const details = await profileService.getStoreDetails(uid);
      return details.storeName.trim() || null;
    },
  });
}
