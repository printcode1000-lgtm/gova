import { SUBMAIN_DECLARATION } from '@asol/account-declarations/submain';
import * as serverEnv from '@/core/config/server-env';
import { resolveCartPrices } from '@/features/cart/server/services/cart-catalogue-pricing.server';
import { productSearchService } from '@/features/product-search/server/services/product-search-service.server';
import { getEnabledProductSearchFields } from '@/features/product-search/server/services/product-search-fields.server';
import { categoryService } from '@/features/categories';
import { authService } from '@/features/auth/server/services/auth-service.bootstrap.server';
import { passwordRecoveryService } from '@/features/password-recovery/server/services/password-recovery-service.server';
import { configureOrdersCore } from '@asol/orders-core';
import { isSuperAdminIdentity } from '@/features/auth/domain/super-admin';
import { registerDataCoreRuntimeConfigPorts } from '@/features/data/ports/data-core-runtime-config-ports';
import { registerDataCoreSpecialtyCatalogPort } from '@/features/data/ports/data-core-specialty-catalog-port';

export type {
  ProductSearchFilters,
  ProductSearchRequest,
  SellerSearchRequest,
} from '@/features/product-search/domain/product-search.types';

export interface SubmainRuntimeConfig {
  env?: NodeJS.ProcessEnv;
}

export interface SubmainSearchTask {
  products: typeof productSearchService.searchProducts;
  sellers: typeof productSearchService.searchSellers;
  fields: typeof getEnabledProductSearchFields;
}

/**
 * Authentication, account identity, and password recovery.
 *
 * These moved here with their routes. The account already held
 * `ASOL_SESSION_SIGNING_SECRET` and the users database — what it lacked was a
 * door, so the ownership registry redirected `POST /api/auth/login` to a
 * deployment that answered `404`. See
 * `docs/08-troubleshooting/problems/owned-route-not-shipped.md`.
 *
 * Session signing stays with the runtimes whose imports prove the need: this
 * account issues and verifies sessions because it serves login, registration,
 * and profile updates. No other workload gains it.
 */
export interface SubmainAuthTask {
  login: typeof authService.login;
  register: typeof authService.register;
  logout: typeof authService.logout;
  checkPhone: typeof authService.checkPhone;
  updateProfile: typeof authService.updateProfile;
}

export interface SubmainPasswordRecoveryTask {
  requestCode: typeof passwordRecoveryService.requestCode;
  verifyCode: typeof passwordRecoveryService.verifyCode;
  resetPassword: typeof passwordRecoveryService.resetPassword;
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
  auth: SubmainAuthTask;
  passwordRecovery: SubmainPasswordRecoveryTask;
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

export function createSubmainRuntime(_config?: SubmainRuntimeConfig): SubmainRuntime {
  configureOrdersCore({ identity: { isSuperAdminIdentity } });

  return {
    accountName: SUBMAIN_DECLARATION.project,
    search: {
      products: (request) => productSearchService.searchProducts(request),
      sellers: (request) => productSearchService.searchSellers(request),
      fields: getEnabledProductSearchFields,
    },
    auth: {
      login: (formData) => authService.login(formData),
      register: (formData) => authService.register(formData),
      logout: () => authService.logout(),
      checkPhone: (phone) => authService.checkPhone(phone),
      updateProfile: (input) => authService.updateProfile(input),
    },
    passwordRecovery: {
      requestCode: (input, ip) => passwordRecoveryService.requestCode(input, ip),
      verifyCode: (input) => passwordRecoveryService.verifyCode(input),
      resetPassword: (input) => passwordRecoveryService.resetPassword(input),
    },
    cart: { resolveCartPrices },
    catalog: { categories: categoryService },
    config: { serverEnv },
  };
}
