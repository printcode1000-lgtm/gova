/** Minimum password length for registration, login, profile change, and recovery. */
export const MIN_PASSWORD_LENGTH = 4;

/** User-visible confirmation phrases, carrying the public product name. */
export const ACCOUNT_DELETION_PHRASE_EN = 'DELETE Pbook ACCOUNT';
export const ACCOUNT_DELETION_PHRASE_AR = 'احذف حساب بيبوك نهائيا';

export const ACCOUNT_DELETION_PHRASES = [
  ACCOUNT_DELETION_PHRASE_EN,
  ACCOUNT_DELETION_PHRASE_AR,
] as const;

/**
 * Phrases shown before the public rename. Still accepted so an installed
 * client that has not received the rename yet keeps working; never displayed.
 */
const LEGACY_ACCOUNT_DELETION_PHRASES = [
  'DELETE ASOL ACCOUNT',
  'احذف حساب أصول نهائيا',
] as const;

export function isAccountDeletionPhraseValid(phrase: string): boolean {
  const normalized = phrase.trim();
  return [...ACCOUNT_DELETION_PHRASES, ...LEGACY_ACCOUNT_DELETION_PHRASES].some(
    (candidate) => candidate === normalized,
  );
}
