/**
 * Layer 3 — the seven Vercel account declarations. Pure data, and nothing else.
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
import { CONTROL_DECLARATION } from './accounts/control';
import { SUBMAIN_DECLARATION } from './accounts/submain';
import { SUB2MAIN_DECLARATION } from './accounts/sub2main';
import { NOTIFICATIONS_DECLARATION } from './accounts/notifications';
import { PRODUCTS_DECLARATION } from './accounts/products';
import { ORDERS_DECLARATION } from './accounts/orders';
import { PROFILES_DECLARATION } from './accounts/profiles';

export interface AccountDeclaration {
  name: 'gova' | 'control' | 'submain' | 'sub2main' | 'notifications' | 'products' | 'orders' | 'profiles';
  project: string;
  /**
   * The Vercel login this account belongs to.
   *
   * Required, so a declaration that omits it fails `typecheck` rather than being caught
   * later by a person reading a table. Two of these files carried the email in a comment
   * and the other five carried it nowhere — which meant the only complete record of who
   * owns which deployment lived in one super-admin page's JSX.
   *
   * It is not a credential. `tokenEnvVar` names where the credential lives; this names
   * the human who can issue a new one when that token is revoked.
   */
  email: string;
  tokenEnvVar: string;
  /** Fallback when the token cannot list teams (scoped deploy tokens). */
  teamIdEnvVar?: string;
  serviceDir?: string;
  deployFromRepositoryRoot?: boolean;
  requiredEnv: readonly string[];
  optionalEnv: readonly string[];
  mirrorEntryPoints: readonly string[];
  runtimeAssets: readonly string[];
}

export {
  GOVA_DECLARATION,
  CONTROL_DECLARATION,
  SUBMAIN_DECLARATION,
  SUB2MAIN_DECLARATION,
  NOTIFICATIONS_DECLARATION,
  PRODUCTS_DECLARATION,
  ORDERS_DECLARATION,
  PROFILES_DECLARATION,
};

export {
  LOCAL_DEVELOPMENT_ACCOUNTS,
  LOCAL_DEVELOPMENT_PORTS,
  localDevelopmentOrigin,
  localDevelopmentPublicEnv,
  type LocalDevelopmentAccount,
} from './accounts/local-development';

export {
  GOVA_RUNTIME_REQUIRED_ENV_KEYS,
  GOVA_RUNTIME_OPTIONAL_ENV_KEYS,
  GOVA_FRONTEND_REQUIRED_ENV_KEYS,
  GOVA_FRONTEND_OPTIONAL_ENV_KEYS,
  GOVA_SHARD_DATABASE_NAMES,
} from './accounts/gova-runtime-env-keys';

export const ACCOUNT_DECLARATIONS: Record<string, AccountDeclaration> = {
  gova: GOVA_DECLARATION,
  control: CONTROL_DECLARATION,
  submain: SUBMAIN_DECLARATION,
  sub2main: SUB2MAIN_DECLARATION,
  notifications: NOTIFICATIONS_DECLARATION,
  products: PRODUCTS_DECLARATION,
  orders: ORDERS_DECLARATION,
  profiles: PROFILES_DECLARATION,
} as const;
