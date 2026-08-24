import { PRODUCTS_DECLARATION } from '@asol/account-declarations/products';
import * as serverEnv from '@/core/config/server-env';
import { productService } from '@/features/product/server/services/product-service.server';
import { productReviewService } from '@/features/product/server/services/product-review-service.server';
import { searchProducts } from '@/features/product-search/server/services/product-search-products.server';
import { getEnabledProductSearchFields } from '@/features/product-search/server/services/product-search-fields.server';
import { categoryService } from '@/features/categories';
import { pharmacyProfileCatalogService } from '@/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog.service.server';
import { registerDataCoreRuntimeConfigPorts } from '@/features/data/ports/data-core-runtime-config-ports';
import { registerDataCoreSpecialtyCatalogPort } from '@/features/data/ports/data-core-specialty-catalog-port';

/**
 * Register `@asol/data-core`'s runtime-config port.
 *
 * The main application does this from `src/instrumentation.ts`. An isolated
 * deployment has no instrumentation, so nothing configured the port here and
 * every route that reached a repository answered
 * `dataCoreRuntimeConfig: getServerRuntimeContext is not configured` — a 500 on
 * this account's real traffic while `/api/health` stayed 200, because health
 * touches no shard. The service deployed READY and was broken.
 *
 * It calls the application's single registrar rather than restating the port
 * here, so the six accounts and the main app cannot drift apart.
 */
// This deployment is Turso-only: it aliases better-sqlite3 to a stub that
// throws, so it must not let the environment pick a local data source.
registerDataCoreRuntimeConfigPorts({ forceRemoteDataSource: true });
// This account reads profile rows, so it also needs the specialty-column catalog.
registerDataCoreSpecialtyCatalogPort();

/**
 * Re-exported so a route has exactly one door, types included. A type-only import costs
 * nothing at runtime, but two doors is still two places to change when a shape moves.
 */
export type {
  ProductSearchFilters,
  ProductSearchRequest,
} from '@/features/product-search/domain/product-search.types';

export interface ProductsRuntimeConfig {
  /** Overrides the environment. Used by tests; production reads the declaration's keys. */
  env?: NodeJS.ProcessEnv;
}

/** Product reads. This account holds only the product Turso database. */
export interface ProductsDatabaseTask {
  products: typeof productService;
  reviews: typeof productReviewService;
  search: typeof searchProducts;
  searchFields: typeof getEnabledProductSearchFields;
  pharmacyProfileCatalog: typeof pharmacyProfileCatalogService;
}

/**
 * Categories are a separate task from the database: they come from JSON inside the
 * bundle, not from Turso. Grouping them under `database` would imply a query that never
 * happens, and a missing database credential would look like it should break them.
 */
export interface ProductsCatalogTask {
  categories: typeof categoryService;
}

/**
 * Image handling here is **key-to-URL string work only**.
 *
 * `asol-products` holds `PRODUCT_R2_*` but no `PRODUCT_R2_API_TOKEN`: it can turn a
 * stored key into a public URL, and it cannot create buckets, change CORS, or upload.
 * Uploads stay on the main app.
 */
export interface ProductsImageTask {
  readonly writeAccess: false;
}

export interface ProductsConfigTask {
  serverEnv: typeof serverEnv;
}

/**
 * The products account runtime, divided by task.
 *
 * An absent key is a capability the account cannot reach: there is no `crypto` task
 * because this account signs nothing.
 */
export interface ProductsRuntime {
  accountName: string;
  database: ProductsDatabaseTask;
  catalog: ProductsCatalogTask;
  images: ProductsImageTask;
  config: ProductsConfigTask;
}

/** Rule 4 — validated against the declaration, never against names typed here. */
export function assertProductsEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = PRODUCTS_DECLARATION.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[products-composition] ${PRODUCTS_DECLARATION.project} is missing required environment ` +
        `values: ${missing.join(', ')}`,
    );
  }
}

/** Layer 2 for the products account — the connector between its tasks. */
export function createProductsRuntime(_config?: ProductsRuntimeConfig): ProductsRuntime {
  return {
    accountName: PRODUCTS_DECLARATION.project,
    database: {
      products: productService,
      reviews: productReviewService,
      search: searchProducts,
      searchFields: getEnabledProductSearchFields,
      pharmacyProfileCatalog: pharmacyProfileCatalogService,
    },
    catalog: { categories: categoryService },
    images: { writeAccess: false },
    config: { serverEnv },
  };
}
