import { ORDERS_DECLARATION } from '@asol/vercel-deploy-core';
import * as serverEnv from '@/core/config/server-env';
import * as marketplaceOrders from '@/modules/data-access/domains/marketplace-orders/index.server';
import { actorFromInput } from '@/modules/marketplace-orders/domain/actor-from-input';

export interface OrdersRuntimeConfig {
  databaseUrl?: string;
  databaseAuthToken?: string;
}

export interface OrdersRuntime {
  accountName: string;
  orders: typeof marketplaceOrders;
  actorFromInput: typeof actorFromInput;
  serverEnv: typeof serverEnv;
}

export function createOrdersRuntime(config?: OrdersRuntimeConfig): OrdersRuntime {
  const dbUrl = config?.databaseUrl ?? process.env.MARKETPLACE_ORDERS_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  if (!dbUrl && process.env.NODE_ENV === 'production') {
    throw new Error('[orders-composition] Missing required database configuration for orders account.');
  }

  return {
    accountName: ORDERS_DECLARATION.project,
    orders: marketplaceOrders,
    actorFromInput,
    serverEnv,
  };
}
