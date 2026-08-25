import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from '../domain/constants';
import { egyptianMobilePhoneValidationIssue } from '../domain/phone';
import type { AuthTranslateFn } from './auth-schemas';

export type ProfileTranslateFn = AuthTranslateFn;

function createPhoneField(t: ProfileTranslateFn) {
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

export function createProfileSchema(t: ProfileTranslateFn) {
  const phoneField = createPhoneField(t);

  return z
    .object({
      phone: phoneField,
      email: z
        .string()
        .email(t('auth.validation.emailInvalid'))
        .optional()
        .or(z.literal('')),
      currentPassword: z.string(),
      newPassword: z.string(),
      confirmPassword: z.string(),
    })
    .superRefine((data, ctx) => {
      const changingPassword =
        !!data.newPassword || !!data.confirmPassword || !!data.currentPassword;
      if (!changingPassword) return;

      if (!data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('profile.validation.currentPasswordRequired'),
          path: ['currentPassword'],
        });
      }
      if (!data.newPassword || data.newPassword.length < MIN_PASSWORD_LENGTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('auth.validation.passwordMinLength'),
          path: ['newPassword'],
        });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('auth.validation.passwordMatch'),
          path: ['confirmPassword'],
        });
      }
    });
}

export type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

export function toProfileFormData(input: {
  phone?: string;
  email?: string | null;
}): ProfileFormData {
  return {
    phone: input.phone ?? '',
    email: input.email ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
}

export function isProfileFormDirty(
  current: ProfileFormData,
  baseline: ProfileFormData,
): boolean {
  return (
    current.phone !== baseline.phone ||
    current.email !== baseline.email ||
    !!current.currentPassword ||
    !!current.newPassword ||
    !!current.confirmPassword
  );
}
