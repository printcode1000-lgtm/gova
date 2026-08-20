import type { MinorUnits } from "../types";

/**
 * Narrows an untrusted request value to minor units, or refuses it.
 *
 * It lived beside the order API routes, so the application's own orchestration had to import from
 * `src/app/api/**` to price anything — a server service reaching into the HTTP layer. What a valid
 * amount *is* has always been the domain's answer.
 */
export function moneyMinor(value: unknown): MinorUnits {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("invalidMoney");
  }
  return amount;
}

export function assertMinorUnits(value: number, field = "amount"): asserts value is MinorUnits {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative safe integer in minor units`);
}
export function assertCurrency(currency: string): void {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be an ISO-4217 three-letter code");
}
export function addMoney(...values: MinorUnits[]): MinorUnits {
  const total = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) throw new Error("money total exceeds JavaScript safe integer range");
  return total;
}
export function subtractMoney(value: MinorUnits, ...deductions: MinorUnits[]): MinorUnits {
  const result = value - addMoney(...deductions);
  if (result < 0) throw new Error("money deductions exceed amount");
  return result;
}

