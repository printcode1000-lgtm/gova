'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useSession } from '@/features/auth/ui';
import type { ProfileContactsData } from '../domain/profile-contacts.entity';
import { profileService } from '../services/profile-service';
import { mergePrimaryContacts } from '../utils/merge-primary-contacts';
import { reportSystemIssue } from '@asol/system-logs-core';
import {
  profileContactsQueryKey,
  profilePublicContactsQueryKey,
} from './profile-contact-query-keys';

function isContactsDirty(
  current: ProfileContactsData,
  baseline: ProfileContactsData,
): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

export function useProfileContacts() {
  const { formatApiError } = useTranslation();
  const { session } = useSession();
  const uid = session?.uid ?? '';
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: profileContactsQueryKey(uid),
    queryFn: () => profileService.getContacts(uid),
    enabled: Boolean(uid),
  });

  const [contacts, setContacts] = useState<ProfileContactsData>({
    phones: [],
    emails: [],
    websites: [],
    socialLinks: [],
    locations: [],
  });
  const [baseline, setBaseline] = useState<ProfileContactsData>(contacts);

  useEffect(() => {
    if (!contactsQuery.data) return;
    setContacts(contactsQuery.data);
    setBaseline(contactsQuery.data);
  }, [contactsQuery.data]);

  useEffect(() => {
    if (contactsQuery.error) {
      reportSystemIssue({ feature: 'Profile', operation: 'load-contacts', error: contactsQuery.error });
    }
  }, [contactsQuery.error]);

  const isDirty = isContactsDirty(contacts, baseline);

  const applySaved = useCallback(
    (saved: ProfileContactsData) => {
      queryClient.setQueryData(profileContactsQueryKey(uid), saved);
      queryClient.setQueryData(profilePublicContactsQueryKey(uid), saved);
      setContacts(saved);
      setBaseline(saved);
    },
    [queryClient, uid],
  );

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileContactsData) => {
      if (!uid) throw new Error('userNotFound');
      const merged = mergePrimaryContacts(
        { phone: session?.phone ?? '', email: session?.email },
        data,
      );
      return profileService.saveContacts({ uid, ...merged });
    },
    onSuccess: applySaved,
    onError: (error) => {
      reportSystemIssue({ feature: 'Profile', operation: 'save-contacts', error });
    },
  });

  const updateContacts = useCallback((data: ProfileContactsData) => {
    setContacts(data);
  }, []);

  const error = useMemo(() => {
    if (contactsQuery.error) {
      return formatApiError(contactsQuery.error);
    }
    if (!saveMutation.error) return null;
    return formatApiError(saveMutation.error);
  }, [contactsQuery.error, formatApiError, saveMutation.error]);

  const saveAsync = async () => {
    await saveMutation.mutateAsync(contacts);
    return true;
  };

  return {
    contacts,
    updateContacts,
    isDirty,
    isLoading: !session || contactsQuery.isLoading,
    isSaving: saveMutation.isPending,
    error,
    saveAsync,
    applySaved,
    saved: saveMutation.isSuccess && !isDirty,
  };
}
