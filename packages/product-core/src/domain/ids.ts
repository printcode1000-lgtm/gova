const SAFE_PRODUCT_ID = /^[a-z0-9-]+$/i;

/**
 * Answer the question, never throw it back.
 *
 * The parameter is typed `string`, but every caller reaches this from a request
 * body cast to its input type without validation — so at runtime the value can
 * be `undefined`, and reading `.length` off it threw. A route that should have
 * rejected a malformed payload with 400 answered 500 `internalServerError`
 * instead, naming nothing.
 *
 * A guard is the boundary where an untrusted value stops being untrusted. If it
 * cannot survive the values that actually arrive, it is not a guard.
 */
export function isSafeProductId(value: string): boolean {
  return typeof value === 'string' && value.length > 0 && SAFE_PRODUCT_ID.test(value);
}

export function normalizeProductStatus(
  value: "draft" | "active" | "archived" | undefined,
): "draft" | "active" | "archived" {
  return value === "draft" || value === "archived" ? value : "active";
}
