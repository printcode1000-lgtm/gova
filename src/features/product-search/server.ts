/**
 * Public server door for `@/features/product-search/server`.
 * Cross-feature consumers MUST import through this file only.
 */
export {
  getEnabledProductSearchFields,
  getEnabledProductSearchFieldKeys,
} from './services/product-search-fields.server';
export { searchProducts, requireCategoryPair } from './services/product-search-products.server';
export {
  ProductSearchService,
  productSearchService,
} from './services/product-search-service.server';
