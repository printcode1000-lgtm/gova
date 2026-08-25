import 'server-only';

import { pharmacyProfileCatalogService } from '@/features/pharmacy-profile-catalog/server';
import {
  registerPharmacyProductLookupPort,
  registerReviewerAvatarPort,
} from '@/features/product/server';
import { profileService } from '@/features/profile/server';

export function registerServerApplicationPorts(): void {
  registerPharmacyProductLookupPort({
    getProduct: (id) => pharmacyProfileCatalogService.getProduct(id),
    isPharmacyProductBucket: (mainCategoryId, subcategoryId) =>
      pharmacyProfileCatalogService.isPharmacyProductBucket(
        mainCategoryId,
        subcategoryId,
      ),
    listProducts: (uid) => pharmacyProfileCatalogService.listProducts(uid),
    updateFixedProduct: (id, uid, details) =>
      pharmacyProfileCatalogService.updateFixedProduct(id, uid, details),
    hideFixedProduct: (id, uid) =>
      pharmacyProfileCatalogService.hideFixedProduct(id, uid),
  });
  registerReviewerAvatarPort({
    getAvatarUrl: async (uid) => {
      const images = await profileService.getStoreImages(uid);
      return images.avatarUrl;
    },
  });
}
