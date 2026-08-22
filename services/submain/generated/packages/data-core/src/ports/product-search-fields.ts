/**
 * Product-search field catalog port — rule 7 the other way.
 *
 * The searchable-column catalog lives in the application (category-aware feature
 * config). Repositories in this package must not import `@/`; the app registers
 * the catalog here.
 */

import type { ProductSearchField } from '../domains/product-search/entities/product-search.types';

export interface DataCoreProductSearchFieldsPort {
  getProductSearchFields(
    mainCategoryId: string,
    subcategoryId: string,
  ): readonly ProductSearchField[];
  getProductSearchFieldByKey(key: string): ProductSearchField | null;
  getDefaultProductSearchFieldKeys(
    mainCategoryId: string,
    subcategoryId: string,
  ): readonly string[];
}

function missing(name: string): never {
  throw new Error(`dataCoreProductSearchFields: ${name} is not configured`);
}

const DEFAULTS: DataCoreProductSearchFieldsPort = {
  getProductSearchFields: () => missing('getProductSearchFields'),
  getProductSearchFieldByKey: () => missing('getProductSearchFieldByKey'),
  getDefaultProductSearchFieldKeys: () => missing('getDefaultProductSearchFieldKeys'),
};

let port: DataCoreProductSearchFieldsPort = { ...DEFAULTS };

export function configureDataCoreProductSearchFields(
  next: Partial<DataCoreProductSearchFieldsPort>,
): void {
  port = { ...port, ...next };
}

export function resetDataCoreProductSearchFields(): void {
  port = { ...DEFAULTS };
}

export function getProductSearchFields(
  mainCategoryId: string,
  subcategoryId: string,
): readonly ProductSearchField[] {
  return port.getProductSearchFields(mainCategoryId, subcategoryId);
}

export function getProductSearchFieldByKey(key: string): ProductSearchField | null {
  return port.getProductSearchFieldByKey(key);
}

export function getDefaultProductSearchFieldKeys(
  mainCategoryId: string,
  subcategoryId: string,
): readonly string[] {
  return port.getDefaultProductSearchFieldKeys(mainCategoryId, subcategoryId);
}
