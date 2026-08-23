import type { LocationEntry } from '@/features/profile/domain/profile-contacts.entity';

import type {
  PhoneLink,
  SocialLink,
} from './ContactInfoCard.contact-types';

const contactEntryId = () => Date.now().toString();

export function createPhoneLink(type: string): PhoneLink {
  return { id: contactEntryId(), number: '', type };
}

export function createWebsiteLink() {
  return { id: contactEntryId(), url: '' };
}

export function createEmailLink() {
  return { id: contactEntryId(), email: '', isPrimary: false };
}

export function createSocialLink(platform: string): SocialLink {
  return { id: contactEntryId(), platform, url: '' };
}

export function createLocationEntry(): LocationEntry {
  return { id: `loc-${Date.now()}`, address: '', latitude: 0, longitude: 0 };
}
