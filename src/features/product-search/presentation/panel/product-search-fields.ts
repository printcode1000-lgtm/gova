import type { ProductSearchField } from "@/features/product-search";

export function defaultFieldKeys(fields: ProductSearchField[]) {
  const basic = fields
    .filter((field) => field.group === "basic")
    .map((field) => field.key);
  return basic.length > 0 ? basic : fields.map((field) => field.key);
}
