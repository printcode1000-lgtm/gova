/** Minimum password length for registration, login, profile change, and recovery. */
export const MIN_PASSWORD_LENGTH = 4;

export const ACCOUNT_DELETION_PHRASE_EN = 'DELETE ASOL ACCOUNT';
export const ACCOUNT_DELETION_PHRASE_AR = 'احذف حساب أصول نهائيا';

export const ACCOUNT_DELETION_PHRASES = [
  ACCOUNT_DELETION_PHRASE_EN,
  ACCOUNT_DELETION_PHRASE_AR,
] as const;

export function isAccountDeletionPhraseValid(phrase: string): boolean {
  const normalized = phrase.trim();
  return ACCOUNT_DELETION_PHRASES.some((candidate) => candidate === normalized);
}
