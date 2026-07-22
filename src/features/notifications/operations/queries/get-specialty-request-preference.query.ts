import "server-only";

import { userNotificationTokenRepository } from "../../repositories/user-notification-token-repository";

export class GetSpecialtyRequestPreferenceQuery {
  execute(uid: string): Promise<boolean> {
    return userNotificationTokenRepository.specialtyRequestsEnabled(uid);
  }

  enabledUids(uids: string[]): Promise<string[]> {
    return userNotificationTokenRepository.filterSpecialtyRequestsEnabled(uids);
  }
}
