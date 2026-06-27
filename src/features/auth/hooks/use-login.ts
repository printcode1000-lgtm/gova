'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import { createLoginSchema, type LoginFormData } from '@/lib/validation/auth';
import { useGuestSession } from '@/hooks/use-guest-session';
import { useSession } from '@/features/auth/components/SessionProvider';
import { authService } from '../services/auth-service';
import { sessionService } from '../services/session-service';
import { authMonitorMeta } from './auth-monitor-meta';
import { startNewFlow } from '@/core/monitor/monitor-store';

export function useLogin() {
  const { t } = useTranslation();
  const { endGuestSession } = useGuestSession();
  const { setSession } = useSession();
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
      return sessionService.saveSession({
        uid: result.uid,
        phone: result.phone,
        email: result.email || undefined,
      });
    },
    meta: authMonitorMeta('useLogin', 'LoginPageContent', 'Login', 'UPDATE'),

    onSuccess: (session) => {
      endGuestSession();
      setSession(session);
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
