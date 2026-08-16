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
