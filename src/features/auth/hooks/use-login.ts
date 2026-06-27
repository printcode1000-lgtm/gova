'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import { createLoginSchema, type LoginFormData } from '@/lib/validation/auth';
import { useGuestSession } from '@/hooks/use-guest-session';
import { authService } from '../services/auth-service';
import { sessionService } from '../services/session-service';
import { CURRENT_SESSION_QUERY_KEY } from '../constants/session-query-keys';
import { authMonitorMeta } from './auth-monitor-meta';
import { startNewFlow } from '@/core/monitor/monitor-store';

export function useLogin() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { endGuestSession } = useGuestSession();
  const [showPassword, setShowPassword] = useState(false);

  const loginSchema = useMemo(() => createLoginSchema(t), [t]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const result = await authService.login(data);
      return sessionService.startSession({
        token: result.token,
        uid: result.uid,
        phone: data.phone,
        displayName: data.phone,
      });
    },
    meta: authMonitorMeta('useLogin', 'LoginPageContent', 'Login', 'UPDATE'),

    onSuccess: (session) => {
      endGuestSession();
      queryClient.setQueryData(CURRENT_SESSION_QUERY_KEY, session);
    },
  });

  const error = useMemo(() => {
    if (!mutation.error) return null;
    const msg = (mutation.error as Error).message;
    if (msg === 'userNotFound') return t('auth.validation.userNotFound');
    if (msg === 'invalidPassword') return t('auth.validation.invalidPassword');
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
    showPassword,
    setShowPassword,
    onSubmit,
  };
}
