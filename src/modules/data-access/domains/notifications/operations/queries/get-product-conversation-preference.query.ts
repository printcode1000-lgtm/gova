import "server-only";

import { userNotificationTokenRepository } from "@/modules/data-access/domains/notifications/repositories/user-notification-token-repository";

export class GetProductConversationPreferenceQuery {
  execute(uid: string): Promise<boolean> {
    return userNotificationTokenRepository.productConversationsEnabled(uid);
  }
}
