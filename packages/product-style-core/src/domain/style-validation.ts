import { normalizeProductStyleComponents } from "./style-defaults";
import type { ProductStyleSettings } from "./style-types";
import { isSafeProductStyleSelectionId } from "./selection-ids";

export function parseProductStyleSettings(value: unknown): ProductStyleSettings | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ProductStyleSettings>;
  const mainCategoryId = candidate.mainCategoryId ?? "";
  const subcategoryId = candidate.subcategoryId ?? "";
  if (
    !isSafeProductStyleSelectionId(mainCategoryId) ||
    !isSafeProductStyleSelectionId(subcategoryId)
  ) {
    return null;
  }
  if (!candidate.components || typeof candidate.components !== "object") {
    return null;
  }
  return {
    mainCategoryId,
    subcategoryId,
    components: normalizeProductStyleComponents(candidate.components),
  };
}

export function isValidProductStyleSettings(value: unknown): value is ProductStyleSettings {
  return parseProductStyleSettings(value) !== null;
}
