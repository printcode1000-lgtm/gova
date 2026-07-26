import assert from "node:assert/strict";

import { createMemoryMarketplaceDb } from "../db/test-client";
import { MarketplaceOrderService } from "../services/marketplace-order-service";

async function main() {
  const db = createMemoryMarketplaceDb();
  const service = new MarketplaceOrderService(db);
  const buyer = { id: "buyer", role: "buyer" as const };
  const seller = { id: "seller", role: "seller" as const };
  const admin = { id: "admin", role: "admin" as const };
  const carrier = { id: "carrier", role: "carrier" as const };

  const order = await service.createProductOrder(
    { currency: "EGP", deliveryAddress: { city: "Cairo" } },
    buyer,
  );
  const item = await service.addOrderItem(
    order.id,
    {
      sellerId: seller.id,
      serviceProviderId: carrier.id,
      productId: "p1",
      productName: "Snapshot",
      quantity: 1,
      unitPrice: 1000,
    },
    buyer,
  );
  await service.sellerAcceptItem(item.id, seller);
  const shipment = await service.createSellerOrderShipment(
    order.id,
    { sellerOrderId: item.seller_order_id },
    admin,
  );
  await service.setShipmentItemsStatus(shipment.id, "received_by_carrier", carrier);
  await service.markShipmentInTransit(shipment.id, carrier);
  await service.buyerRejectDeliveryItem(item.id, "refused on receipt", buyer);

  const rejectedItem = (await db.execute("SELECT status FROM order_items WHERE id=?", [
    item.id,
  ]))[0];
  const rejectedShipmentItem = (
    await db.execute("SELECT status FROM shipment_items WHERE order_item_id=?", [
      item.id,
    ])
  )[0];
  const sellerOrder = (
    await db.execute("SELECT status FROM seller_orders WHERE id=?", [
      item.seller_order_id,
    ])
  )[0];
  const refreshedOrder = (
    await db.execute("SELECT calculated_status FROM orders WHERE id=?", [order.id])
  )[0];

  assert.equal(rejectedItem.status, "delivery_rejected");
  assert.equal(rejectedShipmentItem.status, "delivery_rejected");
  assert.equal(sellerOrder.status, "cancelled");
  assert.equal(refreshedOrder.calculated_status, "fully_cancelled");
  console.log("marketplace-orders delivery rejection: buyer item refusal verified");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
