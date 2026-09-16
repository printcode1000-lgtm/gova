import 'server-only';

import { businessApiOrigins } from '@/core/config/business-api-origins';
import { isDevRuntime } from '@/core/config/runtime-context.server';
import {
  deliverNotificationGrants,
  postNotificationGrantToService,
  registerVerificationDispatchTransport,
} from '@/features/notifications/server';
import { registerPharmacyCatalogProductLookupPort } from '@/features/pharmacy-profile-catalog/server';
import { registerReviewerAvatarPort } from '@/features/product/server';
import { profileService } from '@/features/profile/server';

export function registerServerApplicationPorts(): void {
  registerVerificationDispatchTransport({
    /**
     * The verification SMS gateway signal is delivered by the server, not by the
     * requesting client: registration and password recovery have no session a
     * client-side courier could use.
     *
     * Development fans out in this process against the same cloud token store the
     * development runtime reads — pointing it at the deployed notifications
     * service would never find a registration made on localhost. Production posts
     * the signed grant to that service, which is the only side holding a provider
     * credential. Either way the grant is the authority and nothing widens it.
     */
    deliverGrant: async (grant) => {
      if (isDevRuntime()) {
        const outcome = await deliverNotificationGrants([grant]);
        return outcome.results.some(
          (entry) =>
            'results' in entry &&
            Array.isArray(entry.results) &&
            entry.results.some((recipient) =>
              ['sent', 'partial', 'queued'].includes(recipient.status),
            ),
        );
      }
      return (await postNotificationGrantToService(businessApiOrigins().notifications, grant))
        .delivered;
    },
  });
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
