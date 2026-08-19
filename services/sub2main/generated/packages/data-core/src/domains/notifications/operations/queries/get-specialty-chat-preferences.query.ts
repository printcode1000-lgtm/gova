import "server-only";

import { userNotificationTokenRepository } from "../../repositories/user-notification-token-repository";

export class GetSpecialtyChatPreferencesQuery {
  execute(uid: string) {
    return userNotificationTokenRepository.chatPreferences(uid);
  }

  specialtyRequestEnabledUids(uids: string[]) {
    return userNotificationTokenRepository.filterSpecialtyRequestsEnabled(uids);
  }
}
