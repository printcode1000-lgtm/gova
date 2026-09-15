import assert from "node:assert/strict";
import { MarketplaceOrderService } from "../commands/marketplace-order-service";
import {
  deleteAllMarketplaceOrdersFromDb,
  ORDER_TABLES_IN_DELETE_ORDER,
} from "../commands/delete-all-orders.command.server";
import { createMemoryMarketplaceDb } from "./memory-marketplace-db";

async function main() {
  const db = createMemoryMarketplaceDb();
  const service = new MarketplaceOrderService(db);
  const buyer = { id: "clear-buyer", role: "buyer" as const };
  const seller = { id: "clear-seller", role: "seller" as const };

  const order = await service.createProductOrder(
    { currency: "EGP", deliveryAddress: { city: "Cairo" } },
    buyer,
  );
  await service.addOrderItem(
    order.id,
    { sellerId: seller.id, productId: "clear-product", productName: "Delete me", quantity: 1, unitPrice: 1000 },
    buyer,
  );
  assert.equal((await db.execute("SELECT COUNT(*) AS count FROM orders"))[0]?.count, 1);

  await deleteAllMarketplaceOrdersFromDb(db);

  for (const table of ORDER_TABLES_IN_DELETE_ORDER) {
    const rows = await db.execute(`SELECT COUNT(*) AS count FROM ${table}`);
    assert.equal(rows[0]?.count, 0, `${table} must be empty after clear-all`);
  }

  console.log(
    `marketplace-orders clear-all: ${ORDER_TABLES_IN_DELETE_ORDER.length} tables verified empty`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
