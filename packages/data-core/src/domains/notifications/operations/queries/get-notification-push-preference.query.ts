import "server-only";

import { userNotificationTokenRepository } from "../../repositories/user-notification-token-repository";

export class GetNotificationPushPreferenceQuery {
  execute(uid: string) {
    return userNotificationTokenRepository.getPushEnabled(uid);
  }

  pushEnabledUids(uids: string[]) {
    return userNotificationTokenRepository.filterPushEnabled(uids);
  }
}
