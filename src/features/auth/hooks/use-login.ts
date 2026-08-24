'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/shared/i18n';
import { createLoginSchema, type LoginFormData } from '@asol/auth-core';
import { useGuestSession } from '@/features/auth/application/hooks/use-guest-session';
import { useSession } from '@/features/auth/presentation/SessionProvider';
import { authService } from '../application/services/auth-service';
import { sessionService } from '../application/services/session-service';
import { authMonitorMeta } from './auth-monitor-meta';
import { startNewFlow } from '@asol/observability-core';
import { reportSystemIssue } from '@asol/system-logs-core';
import { queueLoginSuccessToast } from '@/features/auth/presentation/LoginSuccessToast';
import { reportPreAuthFailure } from '@/features/system-logs';
import { announceAuthLoginCompleted } from '../application/auth-lifecycle-events';

export function useLogin() {
  const { t, formatApiError } = useTranslation();
  const router = useRouter();
  const { endGuestSession } = useGuestSession();
  const { setSession } = useSession();
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const result = await authService.login(data);
      if (!result.uid?.trim() || !result.phone?.trim() || !result.sessionToken?.trim()) {
        throw new Error('invalidLoginResponse');
      }
      return sessionService.saveSession({
        uid: result.uid,
        phone: result.phone,
        email: result.email || undefined,
        specialties: result.specialties,
        sessionToken: result.sessionToken,
      });
    },
    meta: authMonitorMeta('useLogin', 'LoginPageContent', 'Login', 'UPDATE'),

    onSuccess: (session) => {
      try {
        endGuestSession();
        setSession(session);
        announceAuthLoginCompleted({ uid: session.uid, phone: session.phone });
        queueLoginSuccessToast();
        router.replace('/home');
      } catch (error) {
        reportPreAuthFailure('complete-login', error);
      }
    },
    onError: (error) => {
      if (error instanceof Error && ['userNotFound', 'invalidPassword'].includes(error.message)) {
        reportPreAuthFailure('login-credentials-rejected', error, {}, 'warn');
        return;
      }
      reportPreAuthFailure('login', error);
      reportSystemIssue({ level: 'error', feature: 'Authentication', operation: 'login', error, page: '/login' });
    },
  });

  const error = useMemo(() => mutation.error ? formatApiError(mutation.error) : null, [mutation.error, formatApiError]);
  const onSubmit = form.handleSubmit(
    (data) => { startNewFlow(); mutation.mutate(data); },
    (fieldErrors) => {
      reportPreAuthFailure('validate-login-form', new Error('loginFormInvalid'), { fields: Object.keys(fieldErrors).sort().join(',') }, 'warn');
    },
  );

  return { form, isSubmitting: mutation.isPending, error, onSubmit };
}