export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface ApiContract<T> {
  readonly name: string;
  readonly parse: (value: unknown) => T;
}

export interface TransportKeyPolicy {
  readonly label?: string;
  readonly allowedSnakeCaseKeys?: readonly string[];
}

export class TransportKeyContractError extends Error {
  readonly jsonPath: string;
  readonly key: string;

  constructor(jsonPath: string, key: string, label = "owned JSON transport") {
    super(`${label} contains snake_case key ${JSON.stringify(key)} at ${jsonPath}; owned JSON keys must be camelCase.`);
    this.name = "TransportKeyContractError";
    this.jsonPath = jsonPath;
    this.key = key;
  }
}

function isTraversable(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  if (value instanceof Date) return false;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return false;
  return true;
}

/**
 * Assert naming only. This intentionally does not rename keys: ownership boundaries
 * must publish an explicit DTO rather than hide persistence/provider drift through a
 * recursive case converter.
 */
export function assertCamelCaseJsonKeys(
  value: unknown,
  policy: TransportKeyPolicy = {},
): void {
  const allowed = new Set(policy.allowedSnakeCaseKeys ?? []);
  const seen = new WeakSet<object>();

  const visit = (current: unknown, jsonPath: string): void => {
    if (!isTraversable(current)) return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${jsonPath}[${index}]`));
      return;
    }

    for (const [key, child] of Object.entries(current)) {
      if (key.includes("_") && !allowed.has(key)) {
        throw new TransportKeyContractError(jsonPath, key, policy.label);
      }
      visit(child, `${jsonPath}.${key}`);
    }
  };

  visit(value, "$ ".trim());
}

export function defineApiContract<T>(
  name: string,
  parse: (value: unknown) => T,
): ApiContract<T> {
  if (!name.trim()) throw new Error("ApiContract name is required.");
  return Object.freeze({ name, parse });
}

export function validateApiContract<T>(
  contract: ApiContract<T>,
  value: unknown,
  policy: TransportKeyPolicy = {},
): T {
  assertCamelCaseJsonKeys(value, { ...policy, label: policy.label ?? contract.name });
  const parsed = contract.parse(value);
  assertCamelCaseJsonKeys(parsed, { ...policy, label: policy.label ?? contract.name });
  return parsed;
}

export function assertApiContractFixture(
  value: unknown,
  policy: TransportKeyPolicy = {},
): void {
  assertCamelCaseJsonKeys(value, { ...policy, label: policy.label ?? "API contract fixture" });
}
