import "server-only";

import { userNotificationTokenRepository } from "@/modules/data-access/domains/notifications/repositories/user-notification-token-repository";

export class SetProductConversationPreferenceCommand {
  execute(uid: string, enabled: boolean): Promise<void> {
    return userNotificationTokenRepository.setProductConversationsEnabled(uid, enabled);
  }
}
