export const profileContactsQueryKey = (uid: string) =>
  ["profile", "contacts", uid] as const;

export const profilePublicContactsQueryKey = (uid: string) =>
  ["profile", "public-contacts", uid] as const;
