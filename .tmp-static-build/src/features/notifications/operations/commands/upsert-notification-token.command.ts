import 'server-only';

import type {
  RegisteredNotificationToken,
  RegisterNotificationTokenInput,
} from '../../domain/entities';
import { userNotificationTokenRepository } from '../../repositories/user-notification-token-repository';

export class UpsertNotificationTokenCommand {
  execute(input: RegisterNotificationTokenInput): Promise<RegisteredNotificationToken> {
    if (!input.uid || !input.token || !input.deviceId || !input.provider) {
      throw new Error('invalidNotificationToken');
    }
    return userNotificationTokenRepository.upsert(input);
  }
}
