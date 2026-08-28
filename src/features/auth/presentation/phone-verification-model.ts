import { formatPhoneInternational, isValidPhone } from '@asol/auth-core';

/** The number as a reader sees it: `+20 102 654 6550`, any country. */
export function formatPhoneDisplay(value: string) {
  return formatPhoneInternational(value);
}

/**
 * Whether a verification code can be sent to this number.
 *
 * A code is delivered to a real handset, so nothing short of a number the
 * phone metadata accepts for its own country qualifies.
 */
export function canSendPhoneOtp(phone: string) {
  return isValidPhone(phone);
}
