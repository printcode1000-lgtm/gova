"use client";

import { useQuery } from "@asol/data-core/browser";

import { profileService } from "../../application/services/profile-service";
import { profilePublicContactsQueryKey } from "./profile-contact-query-keys";

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
