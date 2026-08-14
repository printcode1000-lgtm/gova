import "server-only";

import type { NotificationChatPreferenceChanges } from "@/features/notifications/contracts";
import { userNotificationTokenRepository } from "@/modules/data-access/domains/notifications/repositories/user-notification-token-repository";

export class SetSpecialtyChatPreferencesCommand {
  execute(uid: string, changes: NotificationChatPreferenceChanges) {
    return userNotificationTokenRepository.setChatPreferences(uid, changes);
  }
}
