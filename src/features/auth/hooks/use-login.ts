'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import { createLoginSchema, type LoginFormData } from '@/lib/validation/auth';
import { authService } from '../services/auth-service';
import { AUTH_STATUS_QUERY_KEY } from './use-auth-query';

export function useLogin() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const loginSchema = useMemo(() => createLoginSchema(t), [t]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
    mode: 'onChange',
  });

  const mutation = useMutation({
    mutationFn: (data: LoginFormData) => authService.login(data),

    onSuccess: () => {
      // Invalidate the cached auth status so every component re-reads it
      queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
    },
  });

  // Map domain error codes → localised human-readable messages
  const error = useMemo(() => {
    if (!mutation.error) return null;
    const msg = (mutation.error as Error).message;
    if (msg === 'userNotFound') return t('auth.validation.userNotFound');
    if (msg === 'invalidPassword') return t('auth.validation.invalidPassword');
    return msg;
  }, [mutation.error, t]);

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

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
