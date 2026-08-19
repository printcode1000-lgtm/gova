import { SUBMAIN_DECLARATION } from '@asol/account-declarations/submain';
import * as serverEnv from '@/core/config/server-env';
import { resolveCartPrices } from '@/features/cart/services/cart-catalogue-pricing.server';
import { productSearchService } from '@/features/product-search/services/product-search-service.server';
import { getEnabledProductSearchFields } from '@/features/product-search/services/product-search-fields.server';
import { categoryService } from '@/features/categories';
import { configureOrdersCore } from '@asol/orders-core';
import { isSuperAdminIdentity } from '@/features/auth/utils/super-admin';

export type {
  ProductSearchFilters,
  ProductSearchRequest,
  SellerSearchRequest,
} from '@/features/product-search/entities/product-search.types';

export interface SubmainRuntimeConfig {
  env?: NodeJS.ProcessEnv;
}

export interface SubmainSearchTask {
  products: typeof productSearchService.searchProducts;
  sellers: typeof productSearchService.searchSellers;
  fields: typeof getEnabledProductSearchFields;
}

export interface SubmainCartTask {
  resolveCartPrices: typeof resolveCartPrices;
}

export interface SubmainCatalogTask {
  categories: typeof categoryService;
}

export interface SubmainConfigTask {
  serverEnv: typeof serverEnv;
}

/**
 * The submain account runtime — search, cart pricing, and order-creation routes.
 *
 * Order writes are reached through mirrored route handlers, not through this
 * factory, but orders-core identity wiring must be registered here because this
 * deployment has no `instrumentation.ts`.
 */
export interface SubmainRuntime {
  accountName: string;
  search: SubmainSearchTask;
  cart: SubmainCartTask;
  catalog: SubmainCatalogTask;
  config: SubmainConfigTask;
}

export function assertSubmainEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = SUBMAIN_DECLARATION.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[submain-composition] ${SUBMAIN_DECLARATION.project} is missing required environment ` +
        `values: ${missing.join(', ')}`,
    );
  }
}

export function createSubmainRuntime(_config?: SubmainRuntimeConfig): SubmainRuntime {
  configureOrdersCore({ identity: { isSuperAdminIdentity } });

  return {
    accountName: SUBMAIN_DECLARATION.project,
    search: {
      products: (request) => productSearchService.searchProducts(request),
      sellers: (request) => productSearchService.searchSellers(request),
      fields: getEnabledProductSearchFields,
    },
    cart: { resolveCartPrices },
    catalog: { categories: categoryService },
    config: { serverEnv },
  };
}
