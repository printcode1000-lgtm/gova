"use client";

import { useQuery } from "@tanstack/react-query";

import { profileService } from "../services/profile-service";
import { profilePublicContactsQueryKey } from "./profile-contact-query-keys";

export function useProfilePublicContacts(uid: string) {
  const contactsQuery = useQuery({
    queryKey: profilePublicContactsQueryKey(uid),
    queryFn: () => profileService.getContacts(uid),
    enabled: Boolean(uid),
    staleTime: 0,
    refetchOnMount: "always",
  });

  return {
    contacts: contactsQuery.data ?? null,
    isLoading: contactsQuery.isLoading,
    error: contactsQuery.error,
  };
}
