import 'server-only';

import type { BroadcastRecipient } from '@/features/notifications/domain/entities';
import { broadcastRecipientRepository } from '@/modules/data-access/domains/notifications/repositories/broadcast-recipient-repository';

export class ListBroadcastRecipientsQuery {
  execute(): Promise<BroadcastRecipient[]> {
    return broadcastRecipientRepository.listReceivers();
  }
}
