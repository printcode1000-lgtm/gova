import { SUB2MAIN_DECLARATION } from '@asol/account-declarations/sub2main';
import * as serverEnv from '@/core/config/server-env';
import { categoryService } from '@/features/categories';
import { pharmacyProfileCatalogService } from '@/features/pharmacy-profile-catalog/services/pharmacy-profile-catalog.service.server';
import { productService } from '@/features/product/services/product-service.server';
import { profileService } from '@/features/profile/services/profile-service.bootstrap.server';
import { imageStorageService } from '@/features/storage/services/image-storage-service.bootstrap.server';
import { registerDataCoreRuntimeConfigPorts } from '@/features/data/data-core-runtime-config-ports';
import { registerDataCoreSpecialtyCatalogPort } from '@/features/data/data-core-specialty-catalog-port';

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
registerDataCoreRuntimeConfigPorts();
// This account reads profile rows, so it also needs the specialty-column catalog.
registerDataCoreSpecialtyCatalogPort();

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
