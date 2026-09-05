import {
  assertCamelCaseJsonKeys,
  validateApiContract,
  type ApiContract,
  type TransportKeyPolicy,
} from "./index";

/** Validate an owned response immediately before serialization. */
export function jsonContract<T>(data: T, policy: TransportKeyPolicy = {}): T {
  assertCamelCaseJsonKeys(data, { ...policy, label: policy.label ?? "owned JSON response" });
  return data;
}

/** Validate naming and, when provided, the domain-owned request contract. */
export function validateRequestBody<T>(
  value: unknown,
  contract?: ApiContract<T>,
  policy: TransportKeyPolicy = {},
): T {
  if (contract) return validateApiContract(contract, value, { ...policy, label: policy.label ?? contract.name });
  assertCamelCaseJsonKeys(value, { ...policy, label: policy.label ?? "owned JSON request" });
  return value as T;
}

/** Lightweight service boundary for deployments that use the Web Response API directly. */
export function jsonContractResponse<T>(
  data: T,
  init?: ResponseInit,
  policy: TransportKeyPolicy = {},
): Response {
  return Response.json(jsonContract(data, policy), init);
}

/** Read and validate an owned JSON request without changing key names. */
export async function readJsonContractBody<T>(
  request: Request,
  contract?: ApiContract<T>,
  policy: TransportKeyPolicy = {},
): Promise<T> {
  return validateRequestBody<T>(await request.json(), contract, policy);
}
