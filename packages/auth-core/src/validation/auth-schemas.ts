import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from '../domain/constants';

export type AuthTranslateFn = (key: string) => string;

function createPhoneField(t: AuthTranslateFn) {
  return z
    .string()
    .min(1, t('auth.validation.phoneRequired'))
    .refine((val) => val.replace(/\D/g, '').length === 11, t('auth.validation.phoneLength'))
    .refine((val) => {
      const prefix = val.replace(/\D/g, '').slice(0, 3);
      return ['010', '011', '012', '015'].includes(prefix);
    }, t('auth.validation.phonePrefix'));
}

export function createRegistrationSchema(t: AuthTranslateFn) {
  const phoneField = createPhoneField(t);

  return z
    .object({
      phone: phoneField,
      password: z.string().min(MIN_PASSWORD_LENGTH, t('auth.validation.passwordMinLength')),
      email: z.string().email(t('auth.validation.emailInvalid')).optional().or(z.literal('')),
      confirmPassword: z.string().min(1, t('auth.validation.confirmPasswordRequired')),
      phoneVerified: z.boolean().refine((val) => val === true, {
        message: t('auth.validation.phoneVerification'),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.validation.passwordMatch'),
      path: ['confirmPassword'],
    });
}

export function createLoginSchema(t: AuthTranslateFn) {
  const phoneField = createPhoneField(t);

  return z.object({
    phone: phoneField,
    password: z
      .string()
      .min(1, t('auth.validation.passwordRequired'))
      .min(MIN_PASSWORD_LENGTH, t('auth.validation.passwordMinLength')),
  });
}

export type RegistrationFormData = z.infer<ReturnType<typeof createRegistrationSchema>>;
export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
