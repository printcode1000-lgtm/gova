import type { IProfileRepository } from '../../repositories/profile-repository.interface';
import type { ProfileContactsData } from '../../entities/profile-contacts.entity';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';

export class GetProfileContactsQuery {
  constructor(private profileRepository: IProfileRepository) {}

  async execute(uid: string): Promise<ProfileContactsData> {
    return traceServerLayer('query-command', 'GetProfileContactsQuery', async () => {
      const contacts = await this.profileRepository.getByUid(uid);
      return (
        contacts ?? {
          phones: [],
          emails: [],
          websites: [],
          socialLinks: [],
          locations: [],
        }
      );
    });
  }
}
