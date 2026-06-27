import type { IProfileRepository } from '../../repositories/profile-repository.interface';
import type { ProfileContactsData, SaveProfileContactsInput } from '../../entities/profile-contacts.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

export class UpsertProfileContactsCommand {
  constructor(private profileRepository: IProfileRepository) {}

  async execute(input: SaveProfileContactsInput): Promise<ProfileContactsData> {
    return traceServerLayer('query-command', 'UpsertProfileContactsCommand', async () => {
      const { uid, ...data } = input;
      await this.profileRepository.upsert(uid, data);
      return data;
    });
  }
}
