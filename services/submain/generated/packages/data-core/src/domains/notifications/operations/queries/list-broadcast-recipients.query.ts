import 'server-only';

import type { BroadcastRecipient } from '@asol/notifications-core';
import { broadcastRecipientRepository } from '../../repositories/broadcast-recipient-repository';

export class ListBroadcastRecipientsQuery {
  execute(): Promise<BroadcastRecipient[]> {
    return broadcastRecipientRepository.listReceivers();
  }
}
