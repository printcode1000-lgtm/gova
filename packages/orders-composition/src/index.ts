import { ORDERS_DECLARATION } from '@asol/account-declarations/orders';
import * as serverEnv from '@/core/config/server-env';
import * as marketplaceOrders from '@/modules/data-access/domains/marketplace-orders/index.server';
import { actorFromInput } from '@/modules/marketplace-orders/domain/actor-from-input';

export interface OrdersRuntimeConfig {
  databaseUrl?: string;
  databaseAuthToken?: string;
}

export interface OrdersRuntime {
  accountName: string;
  /**
   * The order-list query, already narrowed to what this account can serve.
   *
   * `GET /api/orders/[orderId]` is deliberately absent: the detail view enriches the
   * order with profile contacts, fulfilment settings and store details, which live in
   * the profile shards this account holds no credentials for. Exposing only the list
   * from here means the boundary is expressed in the type, not in a comment someone
   * has to remember to read.
   */
  listOrdersForActor: (typeof marketplaceOrders)['getMarketplaceOrderQueries'] extends () => infer Q
    ? Q extends { listForActor: infer F }
      ? F
      : never
    : never;
  orders: typeof marketplaceOrders;
  actorFromInput: typeof actorFromInput;
  serverEnv: typeof serverEnv;
}

/**
 * Rule 4 — the composition validates its own inputs, against the account declaration
 * rather than against names typed here.
 *
 * An earlier version checked `MARKETPLACE_ORDERS_DATABASE_URL` and `TURSO_DATABASE_URL`,
 * neither of which this account holds: its keys are `ORDERS_CORE_DATABASE_URL` and
 * `ORDERS_CORE_DATABASE_AUTH_TOKEN`. Hand-written names drift from the declaration
 * silently, and the drift only shows up as a runtime failure on the deployed account.
 * Reading `requiredEnv` means the check cannot disagree with what the deploy pushes.
 */
export function assertOrdersEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = ORDERS_DECLARATION.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[orders-composition] ${ORDERS_DECLARATION.project} is missing required environment ` +
        `values: ${missing.join(', ')}`,
    );
  }
}

export function createOrdersRuntime(config?: OrdersRuntimeConfig): OrdersRuntime {
  // Build time has no account credentials — only the running deployment does. Validating
  // eagerly here made `next build` fail while collecting page data, which is the wrong
  // place to learn about a missing runtime secret.
  if (config?.databaseUrl !== undefined && config.databaseUrl === '') {
    throw new Error(
      `[orders-composition] ${ORDERS_DECLARATION.project} is missing required environment ` +
        `values: ${ORDERS_DECLARATION.requiredEnv[0]}`,
    );
  }

  return {
    accountName: ORDERS_DECLARATION.project,
    listOrdersForActor: ((actor: Parameters<
      ReturnType<typeof marketplaceOrders.getMarketplaceOrderQueries>['listForActor']
    >[0]) =>
      marketplaceOrders.getMarketplaceOrderQueries().listForActor(actor)) as OrdersRuntime['listOrdersForActor'],
    orders: marketplaceOrders,
    actorFromInput,
    serverEnv,
  };
}
