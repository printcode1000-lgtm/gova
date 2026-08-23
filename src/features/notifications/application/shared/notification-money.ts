import type {
  NotificationLocale,
  NotificationVariables,
} from "@asol/notifications-core";

import { formatCurrencyMinor } from "@asol/format-core";

/**
 * A money variable rendered once per supported language.
 *
 * Amounts are stored in minor units and formatted differently per locale
 * (digits, currency placement), so the formatting cannot live in a template.
 * Feed the result to a grant's `variablesByLocale` and each device group
 * receives the amount written the way its reader expects.
 */
export function moneyVariablesByLocale(
  name: string,
  minorUnits: number,
  currency = "EGP",
): Partial<Record<NotificationLocale, NotificationVariables>> {
  const entries = (["ar", "en"] as NotificationLocale[]).map(
    (locale) => [
      locale,
      {
        [name]: formatCurrencyMinor(minorUnits, { locale, currency }),
      },
    ],
  );
  return Object.fromEntries(entries) as Partial<
    Record<NotificationLocale, NotificationVariables>
  >;
}
