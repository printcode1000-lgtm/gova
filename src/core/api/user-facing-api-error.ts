import {
  isKnownBusinessApiErrorCode,
  sanitizeApiErrorCodeForClient,
} from '@/core/api/business-api-error-codes';
import {
  ApiError,
  NetworkOfflineError,
  NetworkUnavailableError,
} from '@/core/api/api-error';
import type { TranslationParams } from '@/shared/i18n';

type TranslateFn = (key: string, params?: TranslationParams) => string;

const DIRECT_TRANSLATION_KEYS: Record<string, string> = {
  userNotFound: 'auth.validation.userNotFound',
  invalidPassword: 'auth.validation.invalidPassword',
  passwordTooShort: 'auth.validation.passwordMinLength',
  phoneAlreadyRegistered: 'auth.validation.phoneAlreadyRegistered',
  emailAlreadyRegistered: 'auth.validation.emailAlreadyRegistered',
  forbidden: 'errors.api.forbidden',
  invalidJsonBody: 'errors.api.invalidJsonBody',
  internalServerError: 'errors.api.internalServerError',
  unexpectedError: 'errors.api.unexpected',
  requestFailed: 'errors.api.requestFailed',
  passwordRecoveryInvalidPhone: 'auth.passwordRecovery.errors.invalidPhone',
  passwordRecoveryRateLimited: 'auth.passwordRecovery.errors.rateLimited',
  passwordRecoveryInvalidCode: 'auth.passwordRecovery.errors.invalidCode',
  passwordRecoveryWeakPassword: 'auth.passwordRecovery.errors.weakPassword',
  passwordRecoveryPasswordMismatch: 'auth.passwordRecovery.errors.passwordMismatch',
  passwordRecoveryInvalidToken: 'auth.passwordRecovery.errors.invalidToken',
  passwordRecoveryNotConfigured: 'auth.passwordRecovery.errors.unavailable',
  contactRateLimited: 'errors.api.rateLimited',
  specialtyChatRateLimited: 'errors.api.rateLimited',
  sessionTokenInvalid: 'errors.api.sessionExpired',
  sessionTokenExpired: 'errors.api.sessionExpired',
};

function translateKey(t: TranslateFn, key: string): string | null {
  const translated = t(key);
  return translated === key ? null : translated;
}

function resolveCodeTranslation(t: TranslateFn, code: string): string | null {
  const direct = DIRECT_TRANSLATION_KEYS[code];
  if (direct) return translateKey(t, direct);
  const specific = translateKey(t, `errors.api.codes.${code}`);
  if (specific) return specific;
  if (isKnownBusinessApiErrorCode(code)) {
    return translateKey(t, 'errors.api.requestFailed');
  }
  return null;
}

/**
 * Maps API/network/render failures to a localized user-safe message.
 * Never returns raw server exception text.
 */
export function formatUserFacingApiError(
  t: TranslateFn,
  error: unknown,
  fallbackKey = 'errors.api.unexpected',
): string {
  if (error instanceof NetworkOfflineError) {
    return t('network.offline');
  }
  if (error instanceof NetworkUnavailableError) {
    return t('network.serverUnavailable');
  }

  const status = error instanceof ApiError ? error.status : undefined;
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const code = sanitizeApiErrorCodeForClient(raw, status);

  const resolved = resolveCodeTranslation(t, code);
  if (resolved) return resolved;

  return translateKey(t, fallbackKey) ?? t('errors.api.unexpected');
}

export function sanitizeThrownApiError(error: unknown): Error {
  if (error instanceof NetworkOfflineError || error instanceof NetworkUnavailableError) {
    return error;
  }
  if (error instanceof ApiError) {
    const code = sanitizeApiErrorCodeForClient(error.message, error.status);
    if (code === error.message) return error;
    return new ApiError(code, error.status);
  }
  if (error instanceof Error) {
    const code = sanitizeApiErrorCodeForClient(error.message);
    if (code === error.message) return error;
    const sanitized = new Error(code);
    sanitized.name = error.name;
    return sanitized;
  }
  return new Error(sanitizeApiErrorCodeForClient(String(error)));
}
