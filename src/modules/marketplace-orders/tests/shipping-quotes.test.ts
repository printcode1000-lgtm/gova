import assert from "node:assert/strict";

import { createMemoryMarketplaceDb } from "../db/test-client";
import { MarketplaceOrderService } from "../services/marketplace-order-service";

async function main() {
  const db = createMemoryMarketplaceDb();
  const service = new MarketplaceOrderService(db);
  const buyer = { id: "quote-buyer", role: "buyer" as const };
  const otherBuyer = { id: "other-buyer", role: "buyer" as const };
  const seller = { id: "quote-seller", role: "seller" as const };
  const provider = {
    id: "quote-provider",
    role: "service_provider" as const,
  };
  const outsider = { id: "outsider", role: "seller" as const };
  const admin = { id: "quote-admin", role: "admin" as const };

  const order = await service.createProductOrder(
    { currency: "EGP", deliveryAddress: { city: "Suez" } },
    buyer,
  );
  const item = await service.addOrderItem(
    String(order.id),
    {
      sellerId: seller.id,
      serviceProviderId: provider.id,
      productId: "quoted-product",
      productName: "Quoted product",
      quantity: 1,
      unitPrice: 5_000,
      shipping: 250,
      requiresSpecialVehicle: true,
    },
    buyer,
  );
  const sellerOrderId = String(item.seller_order_id);

  await assert.rejects(
    () =>
      service.requestShippingQuote(
        String(order.id),
        sellerOrderId,
        250,
        otherBuyer,
      ),
    /Forbidden/,
  );
  const requested = await service.requestShippingQuote(
    String(order.id),
    sellerOrderId,
    250,
    buyer,
  );
  assert.equal(requested.status, "requested");
  assert.equal(requested.total_shipping_price, 250);
  await assert.rejects(
    () =>
      service.requestShippingQuote(String(order.id), sellerOrderId, 250, buyer),
    /already exists/,
  );

  await service.sellerAcceptItem(String(item.id), seller);
  await assert.rejects(
    () => service.sellerMarkItemPreparing(String(item.id), seller),
    /must be accepted/,
  );
  await assert.rejects(
    () =>
      service.proposeShippingQuote(
        sellerOrderId,
        { baseShippingPrice: 1_000 },
        outsider,
      ),
    /Forbidden/,
  );

  const firstOffer = await service.proposeShippingQuote(
    sellerOrderId,
    { baseShippingPrice: 1_000, notes: "Distance-based delivery" },
    provider,
  );
  assert.equal(firstOffer.status, "pending_buyer");
  assert.equal(firstOffer.proposed_by_role, "service_provider");
  assert.equal(firstOffer.base_shipping_price, 1_000);
  assert.equal(firstOffer.special_vehicle_fee, 250);
  assert.equal(firstOffer.total_shipping_price, 1_250);
  await assert.rejects(
    () =>
      service.proposeShippingQuote(
        sellerOrderId,
        { baseShippingPrice: 900 },
        seller,
      ),
    /already pending/,
  );
  await assert.rejects(
    () => service.acceptShippingQuote(String(firstOffer.id), otherBuyer),
    /Forbidden/,
  );

  await service.rejectShippingQuote(String(firstOffer.id), buyer);
  const revisedOffer = await service.proposeShippingQuote(
    sellerOrderId,
    { baseShippingPrice: 1_200, notes: "Revised route" },
    seller,
  );
  assert.equal(revisedOffer.version, 2);
  assert.equal(revisedOffer.total_shipping_price, 1_450);

  await service.acceptShippingQuote(String(revisedOffer.id), buyer);
  const updatedItem = (
    await db.execute("SELECT * FROM order_items WHERE id=?", [item.id])
  )[0];
  const updatedOrder = (
    await db.execute("SELECT * FROM orders WHERE id=?", [order.id])
  )[0];
  assert.equal(updatedItem.shipping_price, 1_450);
  assert.equal(updatedItem.total_price, 6_450);
  assert.equal(updatedOrder.shipping_total, 1_450);
  assert.equal(updatedOrder.grand_total, 6_450);

  await service.sellerMarkItemPreparing(String(item.id), seller);
  await service.sellerMarkItemReadyForShipping(String(item.id), seller);
  const shipment = await service.createSellerOrderShipment(
    String(order.id),
    { sellerOrderId },
    admin,
  );
  assert.equal(shipment.carrier_id, provider.id);

  const auditActions = (
    await db.execute(
      "SELECT action FROM audit_trail WHERE order_id=? AND entity_type='shipping_quote'",
      [order.id],
    )
  ).map((entry) => String(entry.action));
  assert.equal(auditActions.filter((action) => action === "created").length, 1);
  assert.equal(
    auditActions.filter((action) => action === "shipping_fee_changed").length,
    2,
  );
  assert.equal(
    auditActions.filter((action) => action === "rejected").length,
    1,
  );
  assert.equal(
    auditActions.filter((action) => action === "accepted").length,
    1,
  );

  console.log(
    "marketplace shipping quotes: permissions, revisions, acceptance, pricing, and shipment gate verified",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
