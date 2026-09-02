import { SUB2MAIN_DECLARATION } from '@asol/account-declarations/sub2main';
import * as serverEnv from '@/core/config/server-env';
import { categoryService } from '@/features/categories';
import { pharmacyProfileCatalogService } from '@/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog.service.server';
import { productService } from '@/features/product/server/services/product-service.server';
import { productReviewService } from '@/features/product/server/services/product-review-service.server';
import { profileReviewService } from '@/features/profile/server/services/profile-review-service.server';
import { profileService } from '@/features/profile/server/services/profile-service.bootstrap.server';
import { imageStorageService } from '@/features/storage/server/services/image-storage-service.bootstrap.server';
import { registerDataCoreRuntimeConfigPorts } from '@/features/data/ports/data-core-runtime-config-ports';
import { registerDataCoreSpecialtyCatalogPort } from '@/features/data/ports/data-core-specialty-catalog-port';

export type {
  CreateProductInput,
  UpdateProductInput,
} from '@/features/product/domain/product.entity';

export interface Sub2mainRuntimeConfig {
  env?: NodeJS.ProcessEnv;
}

export interface Sub2mainProfileTask {
  service: typeof profileService;
  /**
   * Profile reviews, read and write.
   *
   * The read joins product-derived data, so it cannot live with the other
   * profile reads on `asol-profiles` — that account holds no product
   * credential. This one holds both databases, so it owns the whole family.
   */
  reviews: typeof profileReviewService;
}

export interface Sub2mainProductsTask {
  service: typeof productService;
  /** Product reviews: create, update, delete, helpful votes and seller replies. */
  reviews: typeof productReviewService;
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
// This deployment is Turso-only: it aliases better-sqlite3 to a stub that
// throws, so it must not let the environment pick a local data source.
registerDataCoreRuntimeConfigPorts({ forceRemoteDataSource: true });
// This account reads profile rows, so it also needs the specialty-column catalog.
registerDataCoreSpecialtyCatalogPort();

export function createSub2mainRuntime(_config?: Sub2mainRuntimeConfig): Sub2mainRuntime {
  return {
    accountName: SUB2MAIN_DECLARATION.project,
    profile: { service: profileService, reviews: profileReviewService },
    products: { service: productService, reviews: productReviewService },
    storage: { images: imageStorageService, writeAccess: true },
    catalog: {
      categories: categoryService,
      pharmacyProfileCatalog: pharmacyProfileCatalogService,
    },
    config: { serverEnv },
  };
}
