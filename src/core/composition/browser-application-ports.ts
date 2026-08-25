'use client';

import { createElement } from 'react';
import type { ProductReviewsResult } from '@/features/product';

import { registerAuthCoreBrowserPorts } from '@/features/auth/ui';
import { registerProfileCheckoutPort } from '@/features/cart/ui';
import { createPharmacyInitialDetails } from '@/features/pharmacy-profile-catalog';
import { ProductPharmacySpecs } from '@/features/pharmacy-profile-catalog/ui';
import {
  registerPharmacyInitialDetailsPort,
  registerPharmacySpecsSlot,
  registerProfileReviewsPort,
} from '@/features/product/ui';
import { profileApiService, profileService } from '@/features/profile/ui';
import { registerProfileSpecialtiesPort } from '@/features/profile-products';

export function registerBrowserApplicationPorts(): void {
  registerAuthCoreBrowserPorts();
  registerProfileCheckoutPort({
    getFulfillmentSettings: (uid) => profileService.getFulfillmentSettings(uid),
    getUsersBySpecialty: (categoryId, subcategoryId, offset, limit) =>
      profileService.getUsersBySpecialty(categoryId, subcategoryId, offset, limit),
  });
  registerPharmacyInitialDetailsPort({
    createInitialDetails: createPharmacyInitialDetails,
  });
  registerPharmacySpecsSlot((props) => createElement(ProductPharmacySpecs, props));
  registerProfileReviewsPort({
    list: async (targetUid, sort, offset, limit, uid) =>
      (await profileApiService.listReviews(
        targetUid,
        sort,
        offset,
        limit,
        uid,
      )) as unknown as ProductReviewsResult,
    create: (input) => profileApiService.createReview(input),
    update: (input) => profileApiService.updateReview(input),
    delete: (reviewId, uid) => profileApiService.deleteReview(reviewId, uid),
    helpful: (reviewId, uid) => profileApiService.helpfulReview(reviewId, uid),
    reply: (reviewId, uid, text) => profileApiService.replyReview(reviewId, uid, text),
    deleteReply: (reviewId, uid) => profileApiService.deleteReplyReview(reviewId, uid),
  });
  registerProfileSpecialtiesPort({
    getSpecialties: (uid) => profileService.getSpecialties(uid),
  });
}
