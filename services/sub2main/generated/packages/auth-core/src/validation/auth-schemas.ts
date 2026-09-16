import { z } from 'zod';
import { MIN_PASSWORD_LENGTH } from '../domain/constants';
import { phoneValidationIssue } from '../domain/phone';

export type AuthTranslateFn = (key: string) => string;

function createPhoneField(t: AuthTranslateFn) {
  return z.string().superRefine((value, ctx) => {
    const issue = phoneValidationIssue(value);
    if (!issue) return;
    const key =
      issue === 'required'
        ? 'auth.validation.phoneRequired'
        : issue === 'length'
          ? 'auth.validation.phoneLength'
          : issue === 'country'
            ? 'auth.validation.phoneCountry'
            : 'auth.validation.phoneInvalid';
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(key) });
  });
}

export interface RegistrationSchemaOptions {
  /**
   * Whether this phone number can only be verified by email.
   *
   * Injected rather than decided here: which numbers route to the SMS gateway and
   * which to email is the verification capability's rule, and `@asol/auth-core`
   * cannot import that package — verification-core imports this one for the phone
   * value object. The form asks the question; verification-core answers it.
   *
   * Omitted means "no opinion", and email stays optional. The server enforces the
   * requirement regardless, so a form built without this cannot bypass it — it can
   * only discover the problem later than it should have.
   */
  requiresEmail?: (phone: string) => boolean;
}

export function createRegistrationSchema(
  t: AuthTranslateFn,
  options: RegistrationSchemaOptions = {},
) {
  const phoneField = createPhoneField(t);

  return z
    .object({
      phone: phoneField,
      password: z.string().min(MIN_PASSWORD_LENGTH, t('auth.validation.passwordMinLength')),
      email: z.string().email(t('auth.validation.emailInvalid')).optional().or(z.literal('')),
      storeName: z.string().max(120).optional().or(z.literal('')),
      confirmPassword: z.string().min(1, t('auth.validation.confirmPasswordRequired')),
      verificationProof: z.string().min(1, t('auth.validation.phoneVerification')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.validation.passwordMatch'),
      path: ['confirmPassword'],
    })
    .superRefine((data, ctx) => {
      if (!options.requiresEmail?.(data.phone)) return;
      if ((data.email ?? '').trim()) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('auth.validation.emailRequiredForInternationalPhone'),
        path: ['email'],
      });
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
