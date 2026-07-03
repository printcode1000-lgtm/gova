import categoriesJson from "../../../../public/catagory/categories.json";
import subcategoriesJson from "../../../../public/catagory/subcategories.json";

import type { RawCategory, RawSubcategory } from "./raw-dtos";

// This is the only production module allowed to read the canonical JSON files.
// Consumers receive domain projections from the category public API instead.
const rawCategories = Object.freeze(categoriesJson as RawCategory[]);
const rawSubcategories = Object.freeze(subcategoriesJson as RawSubcategory[]);

export function loadRawCategories(): readonly RawCategory[] {
  return rawCategories;
}

export function loadRawSubcategories(): readonly RawSubcategory[] {
  return rawSubcategories;
}
