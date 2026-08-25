import type { ProfileSpecialtiesSelection } from '@asol/data-core/profile/entities';

export interface ProfileSpecialtiesPort {
  getSpecialties(uid: string): Promise<ProfileSpecialtiesSelection>;
}

let profileSpecialtiesPort: ProfileSpecialtiesPort | null = null;

export function registerProfileSpecialtiesPort(port: ProfileSpecialtiesPort): void {
  profileSpecialtiesPort = port;
}

export function getProfileSpecialtiesPort(): ProfileSpecialtiesPort {
  if (!profileSpecialtiesPort) {
    throw new Error('ProfileSpecialtiesPort is not registered');
  }
  return profileSpecialtiesPort;
}
