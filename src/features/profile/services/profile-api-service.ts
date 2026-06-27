import { govaApi, GOVA_API_ROUTES } from '@/core/api';
import type { ProfileContactsData, SaveProfileContactsInput } from '../entities/profile-contacts.entity';
import type { IProfileService } from './profile-service.interface';

export class ProfileApiService implements IProfileService {
  async getContacts(uid: string): Promise<ProfileContactsData> {
    const route = `${GOVA_API_ROUTES.profile.contacts}?uid=${encodeURIComponent(uid)}`;
    return govaApi.get<ProfileContactsData>(route);
  }

  async saveContacts(input: SaveProfileContactsInput): Promise<ProfileContactsData> {
    return govaApi.put<ProfileContactsData>(GOVA_API_ROUTES.profile.contacts, input);
  }
}

export const profileApiService = new ProfileApiService();
