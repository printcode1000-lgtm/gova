import 'server-only';

import type { DeleteNotificationTokenInput } from '../../domain/entities';
import { userNotificationTokenRepository } from '../../repositories/user-notification-token-repository';

export class DeleteNotificationTokenCommand {
  execute(input: DeleteNotificationTokenInput): Promise<void> {
    if (!input.uid) throw new Error('userNotFound');
    return userNotificationTokenRepository.disable(input);
  }
}
