import "server-only";

import {
  filterSearchFieldsByStyle,
  readNormalizedStyleComponents,
} from "@asol/product-style-core/server";
import {
  getBaseProductSearchFields,
  getDefaultProductSearchFieldKeys,
} from "../config/product-search-fields";
import type { ProductSearchField } from "../entities/product-search.types";

export async function getEnabledProductSearchFields(
  mainCategoryId: string,
  subcategoryId: string,
) {
  const components = await readNormalizedStyleComponents(
    process.cwd(),
    mainCategoryId,
    subcategoryId,
  );
  return filterSearchFieldsByStyle(
    components,
    getBaseProductSearchFields(mainCategoryId, subcategoryId),
  );
}

export async function getEnabledProductSearchFieldKeys(
  mainCategoryId: string,
  subcategoryId: string,
) {
  const fields = await getEnabledProductSearchFields(mainCategoryId, subcategoryId);
  const enabled = fields.map((field) => field.key);
  return enabled.length > 0
    ? enabled
    : getDefaultProductSearchFieldKeys(mainCategoryId, subcategoryId);
}

export type { ProductSearchField };
