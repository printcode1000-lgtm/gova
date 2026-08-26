import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from '../domain/constants';
import { egyptianMobilePhoneValidationIssue } from '../domain/phone';

export type AuthTranslateFn = (key: string) => string;

function createPhoneField(t: AuthTranslateFn) {
  return z.string().superRefine((value, ctx) => {
    const issue = egyptianMobilePhoneValidationIssue(value);
    if (!issue) return;
    const key =
      issue === 'required'
        ? 'auth.validation.phoneRequired'
        : issue === 'length'
          ? 'auth.validation.phoneLength'
          : 'auth.validation.phonePrefix';
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(key) });
  });
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
