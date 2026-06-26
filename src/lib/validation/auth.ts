import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { users } from '@/core/database/schema';
import type { TranslationKey } from '@/lib/i18n';

export type AuthTranslateFn = (key: TranslationKey | string) => string;

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

  // Generate insert schema using drizzle-zod for base columns
  const baseSchema = createInsertSchema(users, {
    phone: phoneField,
    password: z.string().min(4, t('auth.validation.passwordMinLength')),
    email: z.string().email(t('auth.validation.emailInvalid')).optional().or(z.literal('')),
  });

  // Pick fields from base schema and extend with custom confirmPassword and phoneVerified fields
  return baseSchema
    .pick({
      phone: true,
      password: true,
      email: true,
    })
    .extend({
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

  // Generate base insert schema and pick phone/password fields
  return createInsertSchema(users, {
    phone: phoneField,
    password: z
      .string()
      .min(1, t('auth.validation.passwordRequired'))
      .min(4, t('auth.validation.passwordMinLength')),
  }).pick({
    phone: true,
    password: true,
  });
}

export function createAuthSchemas(t: AuthTranslateFn) {
  return {
    loginSchema: createLoginSchema(t),
    registrationSchema: createRegistrationSchema(t),
  };
}

export type RegistrationFormData = z.infer<ReturnType<typeof createRegistrationSchema>>;
export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
