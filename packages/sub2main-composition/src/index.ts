import { SUB2MAIN_DECLARATION } from '@asol/account-declarations/sub2main';
import * as serverEnv from '@/core/config/server-env';
import { categoryService } from '@/features/categories';
import { pharmacyProfileCatalogService } from '@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server';
import { productService } from '@/features/product/services/product-service.server';
import { profileService } from '@/features/profile/services/profile-service.bootstrap.server';
import { imageStorageService } from '@/features/storage/services/image-storage-service.bootstrap.server';

export type {
  CreateProductInput,
  UpdateProductInput,
} from '@/features/product/entities/product.entity';

export interface Sub2mainRuntimeConfig {
  env?: NodeJS.ProcessEnv;
}

export interface Sub2mainProfileTask {
  service: typeof profileService;
}

export interface Sub2mainProductsTask {
  service: typeof productService;
}

export interface Sub2mainStorageTask {
  images: typeof imageStorageService;
  readonly writeAccess: true;
}

export interface Sub2mainCatalogTask {
  categories: typeof categoryService;
  pharmacyProfileCatalog: typeof pharmacyProfileCatalogService;
}

export interface Sub2mainConfigTask {
  serverEnv: typeof serverEnv;
}

/**
 * The sub2main account runtime — seller profile, product writes, and uploads.
 *
 * Reads for the same paths stay on the products and profiles service accounts;
 * this deployment serves writes only through mirrored route handlers.
 */
export interface Sub2mainRuntime {
  accountName: string;
  profile: Sub2mainProfileTask;
  products: Sub2mainProductsTask;
  storage: Sub2mainStorageTask;
  catalog: Sub2mainCatalogTask;
  config: Sub2mainConfigTask;
}

export function assertSub2mainEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = SUB2MAIN_DECLARATION.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[sub2main-composition] ${SUB2MAIN_DECLARATION.project} is missing required environment ` +
        `values: ${missing.join(', ')}`,
    );
  }
}

export function createSub2mainRuntime(_config?: Sub2mainRuntimeConfig): Sub2mainRuntime {
  return {
    accountName: SUB2MAIN_DECLARATION.project,
    profile: { service: profileService },
    products: { service: productService },
    storage: { images: imageStorageService, writeAccess: true },
    catalog: {
      categories: categoryService,
      pharmacyProfileCatalog: pharmacyProfileCatalogService,
    },
    config: { serverEnv },
  };
}
