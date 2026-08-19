import "server-only";

import { userNotificationTokenRepository } from "../../repositories/user-notification-token-repository";

export class SetNotificationPushPreferenceCommand {
  execute(uid: string, pushEnabled: boolean) {
    return userNotificationTokenRepository.setPushEnabled(uid, pushEnabled);
  }
}
