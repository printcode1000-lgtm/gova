import type { IProfileRepository } from '../../repositories/profile-repository.interface';
import type { ProfileContactsData, SaveProfileContactsInput } from '../../entities';
import { traceServerLayer } from '../../../../ports/telemetry';

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
