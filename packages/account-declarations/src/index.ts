/**
 * Layer 3 — the five Vercel account declarations. Pure data, and nothing else.
 *
 * This package exists separately from `@asol/vercel-deploy-core` because the two are
 * different layers with different reasons to change: a declaration changes when an
 * account's environment does, the deploy engine changes when Vercel's API does.
 *
 * The separation is also load-bearing rather than tidy. The engine imports
 * `child_process`, `fs` and the Vercel token handling. While the four
 * `*-composition` packages read their account's name from the engine's barrel, wiring a
 * service route through a composition would have mirrored the entire deploy engine —
 * credential handling included — into that service's deployment, to obtain one string.
 *
 * Nothing in this file may import anything. That is the whole contract, and
 * `src/tests/index.test.ts` enforces it.
 */
import { GOVA_DECLARATION } from './accounts/gova';
import { NOTIFICATIONS_DECLARATION } from './accounts/notifications';
import { PRODUCTS_DECLARATION } from './accounts/products';
import { ORDERS_DECLARATION } from './accounts/orders';
import { PROFILES_DECLARATION } from './accounts/profiles';

export interface AccountDeclaration {
  name: 'gova' | 'notifications' | 'products' | 'orders' | 'profiles';
  project: string;
  tokenEnvVar: string;
  serviceDir?: string;
  requiredEnv: readonly string[];
  optionalEnv: readonly string[];
  mirrorEntryPoints: readonly string[];
  runtimeAssets: readonly string[];
}

export {
  GOVA_DECLARATION,
  NOTIFICATIONS_DECLARATION,
  PRODUCTS_DECLARATION,
  ORDERS_DECLARATION,
  PROFILES_DECLARATION,
};

export const ACCOUNT_DECLARATIONS: Record<string, AccountDeclaration> = {
  gova: GOVA_DECLARATION,
  notifications: NOTIFICATIONS_DECLARATION,
  products: PRODUCTS_DECLARATION,
  orders: ORDERS_DECLARATION,
  profiles: PROFILES_DECLARATION,
} as const;
