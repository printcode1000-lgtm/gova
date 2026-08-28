import {
  DEFAULT_PHONE_COUNTRY,
  asciiDigitsOnly,
  cleanPhoneInput,
  phoneCountry,
  phoneCountryCallingCode,
  phoneCountryOptions,
  phoneNationalNumber,
  type PhoneCountryCode,
  type PhoneCountryOption,
} from "@asol/auth-core";

export interface PhoneCountryChoice extends PhoneCountryOption {
  name: string;
}

/** The phone field's own strings, supplied by the caller's locale. */
export interface PhoneFieldLabels {
  locale: string;
  country: string;
  countrySearch: string;
  countryEmpty: string;
  placeholder: string;
}

export interface PhoneFieldValue {
  country: PhoneCountryCode;
  nationalDigits: string;
}

/**
 * Country names in the reader's own language.
 *
 * `Intl.DisplayNames` already ships the full ISO country list with every
 * runtime this application targets, so no name table is bundled or translated
 * by hand. A runtime without it falls back to the ISO code, which still
 * identifies the country next to its flag and calling code.
 */
function countryNamer(locale: string): (code: string) => string {
  try {
    const display = new Intl.DisplayNames([locale], { type: "region" });
    return (code) => display.of(code) ?? code;
  } catch {
    return (code) => code;
  }
}

export function phoneCountryChoices(locale: string): PhoneCountryChoice[] {
  const nameOf = countryNamer(locale);
  return phoneCountryOptions()
    .map((option) => ({ ...option, name: nameOf(option.code) }))
    .sort((left, right) => left.name.localeCompare(right.name, locale));
}

/**
 * Countries whose name, ISO code, or calling code matches what was typed.
 *
 * A match on the country's own code or on the start of its name comes first:
 * typing `de` means Germany to the person typing it, not the first country
 * whose name happens to contain those letters.
 */
export function filterPhoneCountries(
  choices: readonly PhoneCountryChoice[],
  search: string,
): PhoneCountryChoice[] {
  const term = search.trim().toLowerCase();
  const digits = asciiDigitsOnly(search);
  if (!term && !digits) return [...choices];

  const ranked: Array<{ choice: PhoneCountryChoice; rank: number }> = [];
  for (const choice of choices) {
    const name = choice.name.toLowerCase();
    const code = choice.code.toLowerCase();
    if (digits && choice.callingCode === digits) ranked.push({ choice, rank: 0 });
    else if (code === term) ranked.push({ choice, rank: 1 });
    else if (name.startsWith(term)) ranked.push({ choice, rank: 2 });
    else if (digits && choice.callingCode.startsWith(digits))
      ranked.push({ choice, rank: 3 });
    else if (term && name.includes(term)) ranked.push({ choice, rank: 4 });
  }
  return ranked
    .sort((left, right) => left.rank - right.rank)
    .map((entry) => entry.choice);
}

/** Split a stored value into the country and the national digits to edit. */
export function readPhoneFieldValue(
  value: string,
  fallbackCountry: PhoneCountryCode = DEFAULT_PHONE_COUNTRY,
): PhoneFieldValue {
  const cleaned = cleanPhoneInput(value);
  if (!cleaned) return { country: fallbackCountry, nationalDigits: "" };

  const country = phoneCountry(cleaned, { defaultCountry: fallbackCountry });
  if (country) {
    return {
      country,
      nationalDigits: phoneNationalNumber(cleaned, {
        defaultCountry: fallbackCountry,
      }),
    };
  }

  // Not readable as a whole number yet — the user is still typing. An explicit
  // `+` keeps whatever calling code is already there so the field does not
  // fight the typing; anything else is national digits for the current country.
  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    const callingCode = phoneCountryCallingCode(fallbackCountry);
    return {
      country: fallbackCountry,
      nationalDigits: digits.startsWith(callingCode)
        ? digits.slice(callingCode.length)
        : digits,
    };
  }
  return {
    country: fallbackCountry,
    nationalDigits: cleaned.replace(/^0+/, ""),
  };
}

/**
 * The value the form holds: E.164 while the number is being typed too.
 *
 * A partial number is still spelled `+<calling code><digits>`, so validation
 * reads exactly what will be stored and no caller has to know which country a
 * bare national number belonged to.
 */
export function composePhoneFieldValue({
  country,
  nationalDigits,
}: PhoneFieldValue): string {
  const digits = asciiDigitsOnly(nationalDigits).replace(/^0+/, "");
  if (!digits) return "";
  return `+${phoneCountryCallingCode(country)}${digits}`;
}

/** National digits as typed: folded to ASCII, without a national trunk zero. */
export function readNationalDigitsInput(input: string): string {
  return asciiDigitsOnly(input).replace(/^0+/, "");
}
