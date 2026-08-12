import 'server-only';

import type { BroadcastRecipient } from '@/features/notifications/contracts';
import { broadcastRecipientRepository } from '@/modules/data-access/domains/notifications/repositories/broadcast-recipient-repository';

export class ListBroadcastRecipientsQuery {
  execute(): Promise<BroadcastRecipient[]> {
    return broadcastRecipientRepository.listReceivers();
  }
}
