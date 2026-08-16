import { PRODUCTS_DECLARATION } from '@asol/vercel-deploy-core';
import * as serverEnv from '@/core/config/server-env';
import * as productService from '@/features/product/services/product-service.server';
import * as productReviewService from '@/features/product/services/product-review-service.server';
import * as productSearchProducts from '@/features/product-search/services/product-search-products.server';
import * as productSearchFields from '@/features/product-search/services/product-search-fields.server';
import * as categories from '@/features/categories/index';

export interface ProductsRuntimeConfig {
  databaseUrl?: string;
  databaseAuthToken?: string;
}

export interface ProductsRuntime {
  accountName: string;
  products: typeof productService;
  reviews: typeof productReviewService;
  searchProducts: typeof productSearchProducts;
  searchFields: typeof productSearchFields;
  categories: typeof categories;
  serverEnv: typeof serverEnv;
}

export function createProductsRuntime(config?: ProductsRuntimeConfig): ProductsRuntime {
  const dbUrl = config?.databaseUrl ?? process.env.PRODUCT_CATALOG_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  if (!dbUrl && process.env.NODE_ENV === 'production') {
    throw new Error('[products-composition] Missing required database configuration for products account.');
  }

  return {
    accountName: PRODUCTS_DECLARATION.project,
    products: productService,
    reviews: productReviewService,
    searchProducts: productSearchProducts,
    searchFields: productSearchFields,
    categories,
    serverEnv,
  };
}
