export interface PhoneLink {
  id: string;
  number: string;
  type: string;
}

export interface EmailLink {
  id: string;
  email: string;
  isPrimary: boolean;
}

export interface WebsiteLink {
  id: string;
  url: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  handle: string;
}

export interface ProfileContactsData {
  phones: PhoneLink[];
  emails: EmailLink[];
  websites: WebsiteLink[];
  socialLinks: SocialLink[];
}

export const EMPTY_PROFILE_CONTACTS: ProfileContactsData = {
  phones: [],
  emails: [],
  websites: [],
  socialLinks: [],
};

export interface GetProfileContactsInput {
  uid: string;
}

export interface SaveProfileContactsInput extends ProfileContactsData {
  uid: string;
}
