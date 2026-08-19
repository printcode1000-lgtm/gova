const SAFE_PRODUCT_ID = /^[a-z0-9-]+$/i;

export function isSafeProductId(value: string): boolean {
  return value.length > 0 && SAFE_PRODUCT_ID.test(value);
}

export function normalizeProductStatus(
  value: "draft" | "active" | "archived" | undefined,
): "draft" | "active" | "archived" {
  return value === "draft" || value === "archived" ? value : "active";
}
