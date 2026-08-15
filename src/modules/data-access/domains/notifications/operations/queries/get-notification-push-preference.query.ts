import "server-only";

import { userNotificationTokenRepository } from "@/modules/data-access/domains/notifications/repositories/user-notification-token-repository";

export class GetNotificationPushPreferenceQuery {
  execute(uid: string) {
    return userNotificationTokenRepository.getPushEnabled(uid);
  }

  pushEnabledUids(uids: string[]) {
    return userNotificationTokenRepository.filterPushEnabled(uids);
  }
}
