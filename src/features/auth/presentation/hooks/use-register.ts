'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/shared/i18n';
import { createRegistrationSchema, type RegistrationFormData } from '@asol/auth-core';
import { useGuestSession } from '@/features/auth/application/hooks/use-guest-session';
import { useSession } from '@/features/auth/presentation/SessionProvider';
import { authService } from '../../application/services/auth-service';
import { sessionService } from '../../application/services/session-service';
import { authMonitorMeta } from './auth-monitor-meta';
import { startNewFlow } from '@asol/observability-core';
import { reportSystemIssue } from '@asol/system-logs-core';
import { reportPreAuthFailure } from '@/features/system-logs';
import { queueRegistrationSuccessToast } from '@/features/auth/presentation/LoginSuccessToast';
import { announceAuthLoginCompleted } from '../../application/auth-lifecycle-events';

export function useRegister() {
  const { t, formatApiError } = useTranslation();
  const router = useRouter();
  const { endGuestSession } = useGuestSession();
  const { setSession } = useSession();
  const registrationSchema = useMemo(() => createRegistrationSchema(t), [t]);
  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { phone: '', password: '', confirmPassword: '', email: '', storeName: '', phoneVerified: false },
    mode: 'onChange',
  });
  const password = useWatch({ control: form.control, name: 'password' }) ?? '';
  const phoneVerified = useWatch({ control: form.control, name: 'phoneVerified' }) ?? false;

  const mutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const { uid } = await authService.register(data);
      if (!uid?.trim()) throw new Error('invalidRegistrationResponse');
      const loginResult = await authService.login({ phone: data.phone, password: data.password });
      if (!loginResult.uid?.trim() || !loginResult.phone?.trim() || !loginResult.sessionToken?.trim()) throw new Error('invalidPostRegistrationLoginResponse');
      return sessionService.saveSession({ uid: loginResult.uid || uid, phone: data.phone, email: loginResult.email || undefined, specialties: loginResult.specialties, sessionToken: loginResult.sessionToken });
    },
    meta: authMonitorMeta('useRegister', 'RegistrationPageContent', 'Register', 'INSERT'),
    onSuccess: (session) => {
      try {
        endGuestSession();
        setSession(session);
        announceAuthLoginCompleted({ uid: session.uid, phone: session.phone });
        queueRegistrationSuccessToast();
        router.replace('/home');
      } catch (error) { reportPreAuthFailure('complete-registration', error); }
    },
    onError: (error) => {
      const expectedConflict = error instanceof Error && ['phoneAlreadyRegistered', 'emailAlreadyRegistered'].includes(error.message);
      reportPreAuthFailure(expectedConflict ? 'registration-identity-rejected' : 'register-and-create-session', error, {}, expectedConflict ? 'warn' : 'error');
      reportSystemIssue({ level: expectedConflict ? 'warning' : 'error', feature: 'Authentication', operation: 'register-and-create-session', error, page: '/registration' });
    },
  });

  const error = useMemo(() => mutation.error ? formatApiError(mutation.error) : null, [mutation.error, formatApiError]);
  const onSubmit = form.handleSubmit(
    (data) => { startNewFlow(); mutation.mutate(data); },
    (fieldErrors) => reportPreAuthFailure('validate-registration-form', new Error('registrationFormInvalid'), { fields: Object.keys(fieldErrors).sort().join(',') }, 'warn'),
  );
  return { form, isSubmitting: mutation.isPending, error, password, phoneVerified, onSubmit };
}