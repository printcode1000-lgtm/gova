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

/**
 * The registration lives on `globalThis`, not in this module's scope.
 *
 * A bundler may give one source file more than one instance: Next builds
 * `instrumentation` and each route into separate chunks, and Turbopack emitted
 * two copies of `data-core`'s runtime-config port — the composition root
 * configured one while every route read the other, and production answered 500
 * on every server route. Static checks and `tsx` tests cannot see it, because
 * Node resolves one path to one instance.
 *
 * A `Symbol.for` key on the global object is the same value from whichever
 * instance asks, which is what "configure once at startup" has to mean here.
 */
const PORT_KEY = Symbol.for('@asol/data-core/product-search-fields');

interface PortCarrier {
  [PORT_KEY]?: DataCoreProductSearchFieldsPort;
}

const portDefaults = (): DataCoreProductSearchFieldsPort => ({ ...DEFAULTS });

function portState(): DataCoreProductSearchFieldsPort {
  const carrier = globalThis as PortCarrier;
  carrier[PORT_KEY] ??= portDefaults();
  return carrier[PORT_KEY]!;
}

function setPortState(next: DataCoreProductSearchFieldsPort): void {
  (globalThis as PortCarrier)[PORT_KEY] = next;
}

export function configureDataCoreProductSearchFields(
  next: Partial<DataCoreProductSearchFieldsPort>,
): void {
  setPortState({ ...portState(), ...next });
}

export function resetDataCoreProductSearchFields(): void {
  setPortState({ ...DEFAULTS });
}

export function getProductSearchFields(
  mainCategoryId: string,
  subcategoryId: string,
): readonly ProductSearchField[] {
  return portState().getProductSearchFields(mainCategoryId, subcategoryId);
}

export function getProductSearchFieldByKey(key: string): ProductSearchField | null {
  return portState().getProductSearchFieldByKey(key);
}

export function getDefaultProductSearchFieldKeys(
  mainCategoryId: string,
  subcategoryId: string,
): readonly string[] {
  return portState().getDefaultProductSearchFieldKeys(mainCategoryId, subcategoryId);
}
