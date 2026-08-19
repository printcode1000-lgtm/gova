import { ORDERS_DECLARATION } from '@asol/account-declarations/orders';
import * as serverEnv from '@/core/config/server-env';
import * as marketplaceOrders from '@asol/data-core/marketplace-orders';
import { actorFromInput, configureOrdersCore } from '@asol/orders-core';
import { isSuperAdminIdentity } from '@/features/auth/utils/super-admin';

export interface OrdersRuntimeConfig {
  /** Overrides the environment. Used by tests; production reads the declaration's keys. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Order reads. This account holds the nine order shards and nothing else.
 *
 * `getById` is deliberately absent: the detail view enriches an order with profile
 * contacts, fulfilment settings and store details, which live in shards this account has
 * no credentials for. The boundary is in the type, not in a comment somebody has to
 * remember to read.
 */
export interface OrdersDatabaseTask {
  listForActor: ReturnType<typeof marketplaceOrders.getMarketplaceOrderQueries>['listForActor'];
  listForUser: ReturnType<typeof marketplaceOrders.getMarketplaceOrderQueries>['listForUser'];
  actorFromInput: typeof actorFromInput;
}

export interface OrdersConfigTask {
  serverEnv: typeof serverEnv;
}

/**
 * The orders account runtime, divided by task.
 *
 * One key per task this account owns, and **an absent key is a capability the account
 * cannot reach**. `orders` has no `images` and no `crypto` because it holds neither an R2
 * credential nor a signing secret — so there is nothing here to call, not merely a rule
 * saying do not call it.
 */
export interface OrdersRuntime {
  accountName: string;
  database: OrdersDatabaseTask;
  config: OrdersConfigTask;
}

/**
 * Rule 4 — validates against `ORDERS_DECLARATION.requiredEnv`, not against names typed
 * here. A hand-written name drifts from the declaration silently and only surfaces as a
 * runtime failure on the deployed account.
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

/**
 * Layer 2 for the orders account — the connector between its tasks.
 *
 * Validation is not performed here: this also runs during `next build`, where no account
 * credential exists. Routes call `assertOrdersEnv()` when a request arrives.
 */
export function createOrdersRuntime(_config?: OrdersRuntimeConfig): OrdersRuntime {
  // `@asol/orders-core` fails closed on identity, and this deployment has no `instrumentation.ts`
  // to register it. Wiring an application capability into one account's runtime is precisely what
  // layer 2 exists for, so the composition is the registration point here rather than a seam in
  // `src/` that the orders service would have to mirror for no other reason.
  configureOrdersCore({ identity: { isSuperAdminIdentity } });

  return {
    accountName: ORDERS_DECLARATION.project,
    database: {
      listForActor: (actor) => marketplaceOrders.getMarketplaceOrderQueries().listForActor(actor),
      listForUser: (userId, options) =>
        marketplaceOrders.getMarketplaceOrderQueries().listForUser(userId, options),
      actorFromInput,
    },
    config: { serverEnv },
  };
}
