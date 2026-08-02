import { z } from 'zod';
import type { TranslationKey } from '@/lib/i18n';

export type ProfileTranslateFn = (key: TranslationKey | string) => string;

function createPhoneField(t: ProfileTranslateFn) {
  return z
    .string()
    .min(1, t('auth.validation.phoneRequired'))
    .refine((val) => val.replace(/\D/g, '').length === 11, t('auth.validation.phoneLength'))
    .refine((val) => {
      const prefix = val.replace(/\D/g, '').slice(0, 3);
      return ['010', '011', '012', '015'].includes(prefix);
    }, t('auth.validation.phonePrefix'));
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
      const changingPassword = !!data.newPassword || !!data.confirmPassword || !!data.currentPassword;
      if (!changingPassword) return;

      if (!data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('profile.validation.currentPasswordRequired'),
          path: ['currentPassword'],
        });
      }
      if (!data.newPassword || data.newPassword.length < 4) {
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
