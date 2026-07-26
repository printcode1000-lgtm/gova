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
import type { UserProfile } from '../entities/profile.entity';
import type { ProfileRegistrationSnapshot } from '@/features/profile/entities/profile-editor.entity';
import { reportSystemIssue } from '@/features/system-logs/report-system-issue';

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
  const [phoneVerified, setPhoneVerified] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProfileFormData, string>>
  >({});

  useEffect(() => {
    setForm(initialForm);
    setBaseline(initialForm);
    setFieldErrors({});
    setPhoneVerified(true);
  }, [initialForm]);

  const isDirty = isProfileFormDirty(form, baseline);
  const schema = useMemo(() => createProfileSchema(t), [t]);

  const updateField = useCallback(
    <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
      if (key === 'phone') {
        setPhoneVerified(value === baseline.phone);
      }
    },
    [baseline.phone],
  );

  const applySaved = useCallback(
    async (profile: UserProfile) => {
      const updatedSession = await sessionService.saveSession({
        uid: profile.uid,
        phone: profile.phone,
        email: profile.email ?? undefined,
        specialties: session?.specialties,
        sessionToken: session?.sessionToken,
      });
      setSession(updatedSession);
      const reset = toProfileFormData(profile);
      setForm(reset);
      setBaseline(reset);
      setFieldErrors({});
      setPhoneVerified(true);
    },
    [session?.specialties, setSession],
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
    meta: authMonitorMeta(
      'useProfileRegistration',
      'ProfilePage',
      'UpdateProfile',
      'UPDATE',
    ),
    onSuccess: applySaved,
    onError: (error) => {
      reportSystemIssue({ feature: 'Profile', operation: 'save-registration-info', error });
    },
  });

  const error = useMemo(() => {
    if (!saveMutation.error) return null;
    const msg = (saveMutation.error as Error).message;
    if (msg === 'userNotFound') return t('auth.validation.userNotFound');
    if (msg === 'invalidCurrentPassword')
      return t('profile.validation.invalidCurrentPassword');
    if (msg === 'phoneAlreadyRegistered')
      return t('auth.validation.phoneAlreadyRegistered');
    if (msg === 'currentPasswordRequired')
      return t('profile.validation.currentPasswordRequired');
    return msg;
  }, [saveMutation.error, t]);

  const prepareSnapshot =
    useCallback((): ProfileRegistrationSnapshot | null => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        const nextErrors: Partial<Record<keyof ProfileFormData, string>> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof ProfileFormData;
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        }
        setFieldErrors(nextErrors);
        return null;
      }

      if (form.phone !== baseline.phone && !phoneVerified) {
        setFieldErrors((current) => ({
          ...current,
          phone: t('auth.registration.phoneVerificationRequired'),
        }));
        return null;
      }

      return { ...parsed.data, email: parsed.data.email ?? '', phoneVerified };
    }, [baseline.phone, form, phoneVerified, schema, t]);

  const saveAsync = async () => {
    const snapshot = prepareSnapshot();
    if (!snapshot) return false;
    await saveMutation.mutateAsync(snapshot);
    return true;
  };

  const save = () => {
    void saveAsync();
  };

  return {
    form,
    updateField,
    fieldErrors,
    phoneVerified,
    setPhoneVerified,
    isDirty,
    isLoading: !session,
    isSaving: saveMutation.isPending,
    error,
    save,
    saveAsync,
    prepareSnapshot,
    applySaved,
    saved: saveMutation.isSuccess && !isDirty,
  };
}
