import type {
  NotificationLocale,
  NotificationVariables,
} from "../domain/entities";

const INTL_LOCALES: Record<NotificationLocale, string> = {
  ar: "ar-EG",
  en: "en-EG",
};

/**
 * A money variable rendered once per supported language.
 *
 * Amounts are stored in minor units and formatted differently per locale
 * (digits, currency placement), so the formatting cannot live in a template.
 * Feed the result to `sendToUsers({ variablesByLocale })` and each device
 * group receives the amount written the way its reader expects.
 */
export function moneyVariablesByLocale(
  name: string,
  minorUnits: number,
  currency = "EGP",
): Partial<Record<NotificationLocale, NotificationVariables>> {
  const entries = (Object.keys(INTL_LOCALES) as NotificationLocale[]).map(
    (locale) => [
      locale,
      {
        [name]: new Intl.NumberFormat(INTL_LOCALES[locale], {
          style: "currency",
          currency,
        }).format(minorUnits / 100),
      },
    ],
  );
  return Object.fromEntries(entries) as Partial<
    Record<NotificationLocale, NotificationVariables>
  >;
}
