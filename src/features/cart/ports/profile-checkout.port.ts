import type { ProfileFulfillmentSettings } from '@asol/data-core/profile/entities';

export interface ProfileCheckoutPort {
  getFulfillmentSettings(uid: string): Promise<ProfileFulfillmentSettings>;
  getUsersBySpecialty(
    categoryId: number,
    subcategoryId: number,
    offset: number,
    limit: number,
  ): Promise<readonly unknown[]>;
}

let profileCheckoutPort: ProfileCheckoutPort | null = null;

export function registerProfileCheckoutPort(port: ProfileCheckoutPort): void {
  profileCheckoutPort = port;
}

export function getProfileCheckoutPort(): ProfileCheckoutPort {
  if (!profileCheckoutPort) {
    throw new Error('ProfileCheckoutPort is not registered');
  }
  return profileCheckoutPort;
}
