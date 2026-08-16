import { NOTIFICATIONS_DECLARATION } from '@asol/vercel-deploy-core';
import * as serverEnv from '@/core/config/server-env';
import * as notificationRuntime from '@/features/notifications/service-runtime';

export interface NotificationsRuntimeConfig {
  grantSecret?: string;
}

export interface NotificationsRuntime {
  accountName: string;
  runtime: typeof notificationRuntime;
  serverEnv: typeof serverEnv;
}

export function createNotificationsRuntime(config?: NotificationsRuntimeConfig): NotificationsRuntime {
  const secret = config?.grantSecret ?? process.env.ASOL_NOTIFICATION_GRANT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('[notifications-composition] Missing required ASOL_NOTIFICATION_GRANT_SECRET for notifications account.');
  }

  return {
    accountName: NOTIFICATIONS_DECLARATION.project,
    runtime: notificationRuntime,
    serverEnv,
  };
}
