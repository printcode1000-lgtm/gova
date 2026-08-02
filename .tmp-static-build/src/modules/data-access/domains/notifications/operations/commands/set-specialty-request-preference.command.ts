import "server-only";

import { userNotificationTokenRepository } from "@/modules/data-access/domains/notifications/repositories/user-notification-token-repository";

export class SetSpecialtyRequestPreferenceCommand {
  execute(uid: string, enabled: boolean): Promise<void> {
    return userNotificationTokenRepository.setSpecialtyRequestsEnabled(uid, enabled);
  }
}

