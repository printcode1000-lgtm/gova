import 'server-only';

import type { GetProfileContactsQuery } from '../operations/queries/get-profile-contacts.query';
import type { UpsertProfileContactsCommand } from '../operations/commands/upsert-profile-contacts.command';
import type { ProfileContactsData, SaveProfileContactsInput } from '../entities/profile-contacts.entity';
import type { IProfileService } from './profile-service.interface';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

export class ProfileService implements IProfileService {
  constructor(
    private getProfileContactsQuery: GetProfileContactsQuery,
    private upsertProfileContactsCommand: UpsertProfileContactsCommand,
  ) {}

  async getContacts(uid: string): Promise<ProfileContactsData> {
    return traceServerLayer('server-service', 'ProfileService.getContacts', async () => {
      if (!uid) throw new Error('userNotFound');
      return this.getProfileContactsQuery.execute(uid);
    });
  }

  async saveContacts(input: SaveProfileContactsInput): Promise<ProfileContactsData> {
    return traceServerLayer('server-service', 'ProfileService.saveContacts', async () => {
      if (!input.uid) throw new Error('userNotFound');
      return this.upsertProfileContactsCommand.execute(input);
    });
  }
}
