import { NotificationBuilder } from '@asol/notifications-core/builder';
import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
  type NotificationLocale,
} from '@asol/notifications-core';
import { createNotificationId } from '@asol/notifications-core';
import type { RecipientTokenGrantPayload } from './types';

export interface MobileProviderPayload {
  notificationId: string;
  locale: NotificationLocale;
  templateId?: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  route?: { href: string; label?: string };
  groupKey?: string;
  sound: string;
  dedupeKey: string;
  metadata?: Record<string, string | number | boolean | null>;
}

const builder = new NotificationBuilder();

export function buildMobileProviderPayload(
  send: RecipientTokenGrantPayload['send'],
  locale: NotificationLocale,
): MobileProviderPayload {
  const variables = {
    ...(send.variables ?? {}),
    ...(send.variablesByLocale?.[locale] ?? {}),
  };
  const route = send.routeByLocale?.[locale] ?? send.route;
  if (send.templateId) {
    const built = builder.fromTemplate({
      uid: 'mobile',
      notificationId: createNotificationId(),
      templateId: send.templateId,
      dedupeKey: send.dedupeKey,
      locale,
      variables,
      route,
      metadata: send.metadata,
    });
    return {
      notificationId: built.id,
      locale,
      templateId: send.templateId,
      title: built.title,
      body: built.body,
      category: built.category,
      priority: send.priority ?? built.priority,
      route: built.route,
      groupKey: built.groupKey,
      sound: send.sound ?? built.sound,
      dedupeKey: send.dedupeKey,
      metadata: send.metadata,
    };
  }
  return {
    notificationId: createNotificationId(),
    locale,
    title: send.title?.trim() || 'ASOL',
    body: send.body?.trim() || '',
    category: send.category ?? NotificationCategories.System,
    priority: send.priority ?? NotificationPriorities.Normal,
    route: route ?? {
      href: String(send.metadata?.href ?? '/notifications'),
      label: locale === 'ar' ? 'فتح' : 'Open',
    },
    sound: send.sound ?? NotificationSounds.Default,
    dedupeKey: send.dedupeKey,
    metadata: send.metadata,
  };
}
