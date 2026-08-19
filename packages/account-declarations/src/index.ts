/**
 * Layer 3 — the six Vercel account declarations. Pure data, and nothing else.
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
import { SUBMAIN_DECLARATION } from './accounts/submain';
import { NOTIFICATIONS_DECLARATION } from './accounts/notifications';
import { PRODUCTS_DECLARATION } from './accounts/products';
import { ORDERS_DECLARATION } from './accounts/orders';
import { PROFILES_DECLARATION } from './accounts/profiles';

export interface AccountDeclaration {
  name: 'gova' | 'submain' | 'notifications' | 'products' | 'orders' | 'profiles';
  project: string;
  tokenEnvVar: string;
  serviceDir?: string;
  deployFromRepositoryRoot?: boolean;
  requiredEnv: readonly string[];
  optionalEnv: readonly string[];
  mirrorEntryPoints: readonly string[];
  runtimeAssets: readonly string[];
}

export {
  GOVA_DECLARATION,
  SUBMAIN_DECLARATION,
  NOTIFICATIONS_DECLARATION,
  PRODUCTS_DECLARATION,
  ORDERS_DECLARATION,
  PROFILES_DECLARATION,
};

export {
  GOVA_RUNTIME_REQUIRED_ENV_KEYS,
  GOVA_RUNTIME_OPTIONAL_ENV_KEYS,
  GOVA_SHARD_DATABASE_NAMES,
} from './accounts/gova-runtime-env-keys';

export const ACCOUNT_DECLARATIONS: Record<string, AccountDeclaration> = {
  gova: GOVA_DECLARATION,
  submain: SUBMAIN_DECLARATION,
  notifications: NOTIFICATIONS_DECLARATION,
  products: PRODUCTS_DECLARATION,
  orders: ORDERS_DECLARATION,
  profiles: PROFILES_DECLARATION,
} as const;
