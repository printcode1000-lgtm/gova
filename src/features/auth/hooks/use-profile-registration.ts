'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  createProfileSchema,
  isProfileFormDirty,
  toProfileFormData,
  type ProfileFormData,
} from '@/lib/validation/profile';
import { useSession } from '@/features/auth/components/SessionProvider';
import { authService } from '../services/auth-service';
import { sessionService } from '../services/session-service';
import { authMonitorMeta } from './auth-monitor-meta';

export function useProfileRegistration() {
  const { t } = useTranslation();
  const { session, setSession } = useSession();
  const uid = session?.uid ?? '';

  const initialForm = useMemo(
    () =>
      toProfileFormData({
        phone: session?.phone,
        email: session?.email,
      }),
    [session?.phone, session?.email],
  );

  const [form, setForm] = useState<ProfileFormData>(initialForm);
  const [baseline, setBaseline] = useState<ProfileFormData>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});

  useEffect(() => {
    setForm(initialForm);
    setBaseline(initialForm);
    setFieldErrors({});
  }, [initialForm]);

  const isDirty = isProfileFormDirty(form, baseline);
  const schema = useMemo(() => createProfileSchema(t), [t]);

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!uid) throw new Error('userNotFound');
      return authService.updateProfile({
        uid,
        phone: data.phone,
        email: data.email ?? '',
        currentPassword: data.newPassword ? data.currentPassword : undefined,
        newPassword: data.newPassword || undefined,
      });
    },
    meta: authMonitorMeta('useProfileRegistration', 'ProfilePage', 'UpdateProfile', 'UPDATE'),
    onSuccess: async (profile) => {
      const updatedSession = await sessionService.saveSession({
        uid,
        phone: profile.phone,
        email: profile.email ?? undefined,
      });
      setSession(updatedSession);
      const reset = toProfileFormData(profile);
      setForm(reset);
      setBaseline(reset);
      setFieldErrors({});
    },
  });

  const error = useMemo(() => {
    if (!saveMutation.error) return null;
    const msg = (saveMutation.error as Error).message;
    if (msg === 'userNotFound') return t('auth.validation.userNotFound');
    if (msg === 'invalidCurrentPassword') return t('profile.validation.invalidCurrentPassword');
    if (msg === 'phoneAlreadyRegistered') return t('auth.validation.phoneAlreadyRegistered');
    if (msg === 'currentPasswordRequired') return t('profile.validation.currentPasswordRequired');
    return msg;
  }, [saveMutation.error, t]);

  const save = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof ProfileFormData, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProfileFormData;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }
    saveMutation.mutate(parsed.data);
  };

  return {
    form,
    updateField,
    fieldErrors,
    isDirty,
    isLoading: !session,
    isSaving: saveMutation.isPending,
    error,
    save,
    saved: saveMutation.isSuccess && !isDirty,
  };
}
