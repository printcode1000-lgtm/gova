'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSession } from '@/features/auth/components/SessionProvider';
import type { ProfileContactsData } from '../entities/profile-contacts.entity';
import { profileService } from '../services/profile-service';

const profileContactsQueryKey = (uid: string) => ['profile', 'contacts', uid] as const;

function isContactsDirty(current: ProfileContactsData, baseline: ProfileContactsData): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

export function useProfileContacts() {
  const { t } = useTranslation();
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
  });
  const [baseline, setBaseline] = useState<ProfileContactsData>(contacts);

  useEffect(() => {
    if (!contactsQuery.data) return;
    setContacts(contactsQuery.data);
    setBaseline(contactsQuery.data);
  }, [contactsQuery.data]);

  const isDirty = isContactsDirty(contacts, baseline);

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileContactsData) => {
      if (!uid) throw new Error('userNotFound');
      return profileService.saveContacts({ uid, ...data });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(profileContactsQueryKey(uid), saved);
      setContacts(saved);
      setBaseline(saved);
    },
  });

  const updateContacts = useCallback((data: ProfileContactsData) => {
    setContacts(data);
  }, []);

  const error = useMemo(() => {
    if (contactsQuery.error) {
      return (contactsQuery.error as Error).message;
    }
    if (!saveMutation.error) return null;
    const msg = (saveMutation.error as Error).message;
    if (msg === 'userNotFound') return t('auth.validation.userNotFound');
    return msg;
  }, [contactsQuery.error, saveMutation.error, t]);

  const save = () => {
    saveMutation.mutate(contacts);
  };

  return {
    contacts,
    updateContacts,
    isDirty,
    isLoading: !session || contactsQuery.isLoading,
    isSaving: saveMutation.isPending,
    error,
    save,
    saved: saveMutation.isSuccess && !isDirty,
  };
}
