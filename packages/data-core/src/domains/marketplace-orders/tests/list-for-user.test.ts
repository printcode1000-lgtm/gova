import assert from "node:assert/strict";

import { MarketplaceOrderService } from "../commands/marketplace-order-service";
import { OrderQueryRepository } from "../repositories/order-query-repository";
import { createMemoryMarketplaceDb } from "../db/test-client";

async function run() {
  const db = createMemoryMarketplaceDb();
  const service = new MarketplaceOrderService(db);
  const queries = new OrderQueryRepository(db);

  const buyer = { id: "buyer-1", role: "buyer" as const };
  const seller = { id: "seller-1", role: "seller" as const };
  const provider = { id: "provider-1", role: "service_provider" as const };

  async function createBuyerOrder(index: number) {
    const order = await service.createProductOrder(
      {
        buyerId: buyer.id,
        currency: "EGP",
        deliveryAddress: {
          buyerUid: buyer.id,
          phone: "01000000000",
          address: `Address ${index}`,
          latitude: null,
          longitude: null,
          paymentMethod: "cash_on_delivery",
        },
      },
      buyer,
    );
    await service.addOrderItem(
      String(order.id),
      {
        sellerId: seller.id,
        serviceProviderId: provider.id,
        productId: `product-${index}`,
        productName: `Product ${index}`,
        quantity: 1,
        unitPrice: 1_000 * index,
        shipping: 0,
      },
      buyer,
    );
    return order;
  }

  for (let index = 1; index <= 6; index += 1) {
    await createBuyerOrder(index);
  }

  const buyerPage1 = await queries.listForUser(buyer.id, { limit: 5, offset: 0 });
  assert.equal(buyerPage1.items.length, 5);
  assert.equal(buyerPage1.hasMore, true);
  assert.equal(buyerPage1.items[0]?.viewerRoles[0], "buyer");

  const buyerPage2 = await queries.listForUser(buyer.id, { limit: 5, offset: 5 });
  assert.equal(buyerPage2.items.length, 1);
  assert.equal(buyerPage2.hasMore, false);

  const sellerView = await queries.listForUser(seller.id, { limit: 5, offset: 0 });
  assert.equal(sellerView.items.length, 5);
  assert.ok(sellerView.items.every((entry) => entry.viewerRoles.includes("seller")));

  const providerView = await queries.listForUser(provider.id, {
    limit: 5,
    offset: 0,
  });
  assert.ok(
    providerView.items.every((entry) =>
      entry.viewerRoles.includes("service_provider"),
    ),
  );

  const orderedIds = buyerPage1.items.map((entry) => String(entry.order.id));
  const timestamps = buyerPage1.items.map((entry) =>
    String(entry.order.created_at ?? ""),
  );
  assert.deepEqual([...timestamps].sort().reverse(), timestamps);
  assert.equal(new Set(orderedIds).size, orderedIds.length);

  console.log("order list for user: pagination, roles, and ordering verified");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
