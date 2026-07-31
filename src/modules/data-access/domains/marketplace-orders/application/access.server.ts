import "server-only";

import { MarketplaceOrderService } from "../commands/marketplace-order-service";
import { createMarketplaceOrdersDb } from "../db/client";
import type { MarketplaceDb } from "../ports/marketplace-order-store";
import { OrderQueryRepository } from "../repositories/order-query-repository";

let service: MarketplaceOrderService | undefined;
let queries: OrderQueryRepository | undefined;

function createTransactionalMarketplaceOrderService(
  db: MarketplaceDb = createMarketplaceOrdersDb(),
): MarketplaceOrderService {
  const base = new MarketplaceOrderService(db);
  return new Proxy(base, {
    get(target, property) {
      const value = target[property as keyof MarketplaceOrderService];
      if (typeof value !== "function") return value;
      return (...args: unknown[]) =>
        db.transaction(async (transaction) => {
          const scoped = new MarketplaceOrderService(transaction);
          const operation = scoped[property as keyof MarketplaceOrderService];
          if (typeof operation !== "function") {
            throw new Error(`Unknown marketplace order operation: ${String(property)}`);
          }
          return Reflect.apply(operation, scoped, args);
        });
    },
  });
}

export function getMarketplaceOrderService(): MarketplaceOrderService {
  return (service ??= createTransactionalMarketplaceOrderService());
}

export function getMarketplaceOrderQueries(): OrderQueryRepository {
  return (queries ??= new OrderQueryRepository(createMarketplaceOrdersDb()));
}
