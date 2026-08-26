/**
 * The value contracts a simulated field may declare.
 *
 * Each entry is a *shape*, never data. A scenario supplies the value; this
 * decides whether that value is the kind of thing the field accepts. Keeping
 * the list closed is what stops a contract from quietly becoming a place to
 * park a real phone number or an order id.
 */
export interface UiValueContract {
  readonly name: string;
  /** What the field accepts, in one line, for the coverage report. */
  readonly description: string;
  readonly accepts: (value: string) => boolean;
}

function contract(
  name: string,
  description: string,
  accepts: (value: string) => boolean,
): UiValueContract {
  return { name, description, accepts };
}

const SAFE_TEXT = /^[\p{L}\p{N} ._@+-]{1,120}$/u;

export const UI_VALUE_CONTRACTS: readonly UiValueContract[] = [
  contract("search-term", "Free search text, short and printable", (value) =>
    value.length > 0 && value.length <= 60 && SAFE_TEXT.test(value),
  ),
  contract("short-text", "One short line of printable text", (value) =>
    value.length > 0 && value.length <= 120 && SAFE_TEXT.test(value),
  ),
  contract("long-text", "A multi-line description", (value) =>
    value.length > 0 && value.length <= 1000,
  ),
  contract("quantity", "A positive whole number", (value) => /^[1-9][0-9]{0,4}$/.test(value)),
  contract("decimal-amount", "A non-negative decimal amount", (value) =>
    /^[0-9]{1,9}(?:\.[0-9]{1,2})?$/.test(value),
  ),
  contract("phone-number", "A simulation account phone number", (value) =>
    /^\+?[0-9]{8,15}$/.test(value),
  ),
  contract("password", "A simulation account password", (value) =>
    value.length >= 6 && value.length <= 64,
  ),
  contract("email-address", "An email address", (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
  ),
  contract("internal-image", "An internal catalog image reference chosen by the runner", (value) =>
    /^[a-zA-Z0-9/_.-]{1,200}$/.test(value),
  ),
  contract("option-key", "A lowercase option key from a fixed domain list", (value) =>
    /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(value),
  ),
];

const BY_NAME = new Map(UI_VALUE_CONTRACTS.map((entry) => [entry.name, entry]));

export function uiValueContract(name: string): UiValueContract | null {
  return BY_NAME.get(name) ?? null;
}

export function isUiValueContractName(name: unknown): name is string {
  return typeof name === "string" && BY_NAME.has(name);
}

export type UiValueCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/** Checks a scenario-supplied value against a declared contract. */
export function checkUiValue(contractName: string | undefined, value: string | undefined): UiValueCheck {
  if (contractName === undefined) {
    return value === undefined
      ? { ok: true }
      : { ok: false, reason: "a value was supplied but the target declares no valueContract" };
  }
  const declared = uiValueContract(contractName);
  if (!declared) return { ok: false, reason: `unknown value contract "${contractName}"` };
  if (value === undefined) return { ok: false, reason: `contract "${contractName}" requires a value` };
  return declared.accepts(value)
    ? { ok: true }
    : { ok: false, reason: `value does not satisfy contract "${contractName}" (${declared.description})` };
}
