export {
  getDefaultProductSearchFieldKeys,
  getProductSearchFields,
} from "./config/product-search-fields";
export { productSearchApiService } from "./services/product-search-api-service";
export {
  SEARCH_CATEGORY_ID,
  isSearchCategorySelectionShaped,
  parseProductSearchRequest,
  parseSellerSearchRequest,
} from './domain/product-search.request';
export type {
  ProductSearchField,
  ProductSearchFilters,
  ProductSearchMode,
  ProductSearchRequest,
  ProductSearchResult,
  ProductSearchSort,
  SellerSearchRequest,
  SellerSearchResult,
  SellerSearchSort,
} from './domain/product-search.types';

/* BEGIN GENERATED FEATURE DOOR EXPORTS */
/** Auto-maintained sealed-door re-exports. Do not edit by hand. */
export * from './domain/product-search.request';
/* END GENERATED FEATURE DOOR EXPORTS */
