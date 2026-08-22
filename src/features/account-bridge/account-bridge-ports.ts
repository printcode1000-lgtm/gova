'use client';

import { configureAccountBridge } from '@asol/account-bridge';
import {
  getNotificationsPublicUrl,
  publicEnv,
} from '@/core/config/public-env';
import { getNotificationGrantDeliveryIdentity } from '@/features/notifications/domain/notification-grant-delivery-context';
import { readNotificationGrants } from '@/features/notifications/domain/notification-grant-envelope';

/** Registers public-env and notification-grant helpers into `@asol/account-bridge`. */
export function registerAccountBridgePorts(): void {
  configureAccountBridge({
    publicEnv: {
      developmentBuild: publicEnv.developmentBuild,
      basePath: publicEnv.basePath,
      mode: publicEnv.mode,
      apiBaseUrl: publicEnv.apiBaseUrl,
      productsUrl: publicEnv.productsUrl,
      ordersUrl: publicEnv.ordersUrl,
      profilesUrl: publicEnv.profilesUrl,
      submainUrl: publicEnv.submainUrl,
      sub2mainUrl: publicEnv.sub2mainUrl,
      mobilePushCredentialBlob: publicEnv.mobilePushCredentialBlob,
    },
    getNotificationsPublicUrl,
    readNotificationGrants,
    getNotificationGrantDeliveryIdentity,
  });
}
