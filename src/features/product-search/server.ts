/**
 * Public server door for `@/features/product-search/server`.
 * Cross-feature consumers MUST import through this file only.
 */
export {
  getEnabledProductSearchFields,
  getEnabledProductSearchFieldKeys,
} from './server/services/product-search-fields.server';
export { searchProducts, requireCategoryPair } from './server/services/product-search-products.server';
export {
  ProductSearchService,
  productSearchService,
} from './server/services/product-search-service.server';
