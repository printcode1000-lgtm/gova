import "server-only";

import {
  filterSearchFieldsByStyle,
  readNormalizedStyleComponents,
} from "@asol/product-style-core/server";
import {
  getBaseProductSearchFields,
  getDefaultProductSearchFieldKeys,
  getProductSearchFieldByKey,
  getProductSearchFields,
} from "../../application/config/product-search-fields";
import type { ProductSearchField } from "../../domain/product-search.types";
import { configureDataCoreProductSearchFields } from "@asol/data-core/product-search-fields";

/** Register the search-field metadata required by `@asol/data-core`. */
export function registerDataCoreProductSearchFieldsPort(): void {
  configureDataCoreProductSearchFields({
    getProductSearchFields,
    getProductSearchFieldByKey,
    getDefaultProductSearchFieldKeys,
  });
}

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
