import "server-only";

import { userNotificationTokenRepository } from "@/modules/data-access/domains/notifications/repositories/user-notification-token-repository";

export class SetNotificationPushPreferenceCommand {
  execute(uid: string, pushEnabled: boolean) {
    return userNotificationTokenRepository.setPushEnabled(uid, pushEnabled);
  }
}
