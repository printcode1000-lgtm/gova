import type { PhoneFieldLabels } from "./phone-field-model";

/**
 * The phone field's own strings, built from the caller's translator.
 *
 * The translator is passed in rather than read from the i18n runtime here: the
 * phone module stays a leaf that nothing in the application graph depends back
 * on, which is what keeps it out of the shared-module cycle audit.
 */
export function phoneFieldLabels(
  t: (key: string) => string,
  locale: string,
): PhoneFieldLabels {
  return {
    locale,
    country: t("auth.phone.countryLabel"),
    countrySearch: t("auth.phone.countrySearch"),
    countryEmpty: t("auth.phone.countryEmpty"),
    placeholder: t("auth.phone.placeholder"),
  };
}
