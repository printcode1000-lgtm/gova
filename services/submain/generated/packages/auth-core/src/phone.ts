/**
 * Public phone door for `@asol/auth-core/phone`.
 *
 * The phone value object is used well beyond authentication — profile contact
 * search keys are the first case — so it has a door of its own. A consumer that
 * only needs to read, compare, or key a phone number reaches it here and pulls
 * in neither the validation schemas nor anything else the main door carries.
 */
export {
  phoneValidationIssue,
  normalizePhone,
  tryNormalizePhone,
  isValidPhone,
  cleanPhoneInput,
  phoneCountry,
  phoneNationalNumber,
  formatPhoneInternational,
  phoneSearchKey,
  samePhone,
  phoneDialDigits,
  phoneCountryOptions,
  phoneCountryCallingCode,
  isPhoneCountry,
  legacyEgyptianPhoneToE164,
  DEFAULT_PHONE_COUNTRY,
  type PhoneValidationIssue,
  type PhoneCountryCode,
  type PhoneCountryOption,
  type PhoneParseOptions,
} from './domain/phone';

export { toAsciiDigits, asciiDigitsOnly } from './domain/digits';
