import "server-only";

import { userNotificationTokenRepository } from "../../repositories/user-notification-token-repository";

export class SetSpecialtyRequestPreferenceCommand {
  execute(uid: string, enabled: boolean): Promise<void> {
    return userNotificationTokenRepository.setSpecialtyRequestsEnabled(uid, enabled);
  }
}

