"use client";

import { useQuery } from "@tanstack/react-query";

import { profileService } from "../services/profile-service";

const profilePublicContactsQueryKey = (uid: string) =>
  ["profile", "public-contacts", uid] as const;

export function useProfilePublicContacts(uid: string) {
  const contactsQuery = useQuery({
    queryKey: profilePublicContactsQueryKey(uid),
    queryFn: () => profileService.getContacts(uid),
    enabled: Boolean(uid),
  });

  return {
    contacts: contactsQuery.data ?? null,
    isLoading: contactsQuery.isLoading,
    error: contactsQuery.error,
  };
}
