'use client';

import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import { createRegistrationSchema, type RegistrationFormData } from '@/lib/validation/auth';
import { useGuestSession } from '@/hooks/use-guest-session';
import { authService } from '../services/auth-service';
import { sessionService } from '../services/session-service';
import { setSessionCache } from './session-cache';
import { authMonitorMeta } from './auth-monitor-meta';
import { startNewFlow } from '@/core/monitor/monitor-store';

export function useRegister() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { endGuestSession } = useGuestSession();

  const registrationSchema = useMemo(() => createRegistrationSchema(t), [t]);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      phone: '',
      password: '',
      confirmPassword: '',
      email: '',
      phoneVerified: false,
    },
    mode: 'onChange',
  });

  const password = useWatch({ control: form.control, name: 'password' }) ?? '';
  const phoneVerified = useWatch({ control: form.control, name: 'phoneVerified' }) ?? false;

  const mutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const { uid } = await authService.register(data);
      const loginResult = await authService.login({
        phone: data.phone,
        password: data.password,
      });
      return sessionService.startSession({
        token: loginResult.token,
        uid: loginResult.uid || uid,
        phone: data.phone,
        email: data.email?.trim() || loginResult.email || '',
        displayName: data.email?.trim() || data.phone,
      });
    },
    meta: authMonitorMeta('useRegister', 'RegistrationPageContent', 'Register', 'INSERT'),

    onSuccess: (session) => {
      endGuestSession();
      setSessionCache(queryClient, session);
    },
  });

  const error = useMemo(() => {
    if (!mutation.error) return null;
    const msg = (mutation.error as Error).message;
    if (msg === 'phoneAlreadyRegistered') return t('auth.validation.phoneAlreadyRegistered');
    return msg;
  }, [mutation.error, t]);

  const onSubmit = form.handleSubmit((data) => {
    startNewFlow();
    mutation.mutate(data);
  });

  return {
    form,
    isSubmitting: mutation.isPending,
    error,
    submitted: mutation.isSuccess,
    password,
    phoneVerified,
    onSubmit,
  };
}
