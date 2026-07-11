import 'server-only';

import type {
  DeleteNotificationTokenInput,
  RegisteredNotificationToken,
  RegisterNotificationTokenInput,
} from '../domain/entities';
import { DeleteNotificationTokenCommand } from '../operations/commands/delete-notification-token.command';
import { UpsertNotificationTokenCommand } from '../operations/commands/upsert-notification-token.command';
import { ListNotificationTokensQuery } from '../operations/queries/list-notification-tokens.query';

export class NotificationTokenService {
  constructor(
    private readonly upsertToken = new UpsertNotificationTokenCommand(),
    private readonly deleteToken = new DeleteNotificationTokenCommand(),
    private readonly listTokens = new ListNotificationTokensQuery(),
  ) {}

  register(input: RegisterNotificationTokenInput): Promise<RegisteredNotificationToken> {
    return this.upsertToken.execute(input);
  }

  remove(input: DeleteNotificationTokenInput): Promise<void> {
    return this.deleteToken.execute(input);
  }

  list(uid: string): Promise<RegisteredNotificationToken[]> {
    return this.listTokens.byUid(uid);
  }
}
