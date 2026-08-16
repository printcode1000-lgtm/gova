import { PRODUCTS_DECLARATION } from '@asol/account-declarations/products';
import * as serverEnv from '@/core/config/server-env';
import { productService } from '@/features/product/services/product-service.server';
import { productReviewService } from '@/features/product/services/product-review-service.server';
import { searchProducts } from '@/features/product-search/services/product-search-products.server';
import { getEnabledProductSearchFields } from '@/features/product-search/services/product-search-fields.server';
import { categoryService } from '@/features/categories';
import { pharmacyProfileCatalogService } from '@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server';

/**
 * Re-exported so a route has exactly one door, types included. A type-only import costs
 * nothing at runtime, but two doors is still two places to change when a shape moves.
 */
export type {
  ProductSearchFilters,
  ProductSearchRequest,
} from '@/features/product-search/entities/product-search.types';

export interface ProductsRuntimeConfig {
  /** Overrides the environment. Used by tests; production reads the declaration's keys. */
  env?: NodeJS.ProcessEnv;
}

export interface ProductsRuntime {
  accountName: string;
  products: typeof productService;
  reviews: typeof productReviewService;
  searchProducts: typeof searchProducts;
  getEnabledProductSearchFields: typeof getEnabledProductSearchFields;
  categories: typeof categoryService;
  pharmacyProfileCatalog: typeof pharmacyProfileCatalogService;
  serverEnv: typeof serverEnv;
}

/**
 * Rule 4 — validates against `PRODUCTS_DECLARATION.requiredEnv`, not against names typed
 * here. A hand-written name drifts from the declaration silently and only surfaces as a
 * runtime failure on the deployed account.
 */
export function assertProductsEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = PRODUCTS_DECLARATION.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[products-composition] ${PRODUCTS_DECLARATION.project} is missing required environment ` +
        `values: ${missing.join(', ')}`,
    );
  }
}

/**
 * Layer 2 for the products account.
 *
 * This account does reach image storage — product images live on the legacy product R2
 * bucket — but it holds no `PRODUCT_R2_API_TOKEN`: turning a key into a URL is string
 * work and needs only the narrow accessors. That is why the R2 variables are optional in
 * the declaration and are not checked here.
 *
 * Validation is not performed in this factory: it runs during `next build` as well as per
 * request, and build time has no account credentials.
 */
export function createProductsRuntime(_config?: ProductsRuntimeConfig): ProductsRuntime {
  return {
    accountName: PRODUCTS_DECLARATION.project,
    products: productService,
    reviews: productReviewService,
    searchProducts,
    getEnabledProductSearchFields,
    categories: categoryService,
    pharmacyProfileCatalog: pharmacyProfileCatalogService,
    serverEnv,
  };
}
