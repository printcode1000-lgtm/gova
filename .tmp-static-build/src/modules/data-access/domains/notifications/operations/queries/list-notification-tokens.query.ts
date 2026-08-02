import 'server-only';

import type { RegisteredNotificationToken } from '@/features/notifications/domain/entities';
import { userNotificationTokenRepository } from '@/modules/data-access/domains/notifications/repositories/user-notification-token-repository';

export class ListNotificationTokensQuery {
  byUid(uid: string): Promise<RegisteredNotificationToken[]> {
    if (!uid) throw new Error('userNotFound');
    return userNotificationTokenRepository.listByUid(uid);
  }

  byUids(uids: string[]): Promise<Record<string, RegisteredNotificationToken[]>> {
    const unique = Array.from(new Set(uids.map((uid) => uid.trim()).filter(Boolean)));
    if (unique.length === 0) throw new Error('notificationRecipientsRequired');
    return userNotificationTokenRepository.listByUids(unique);
  }
}
