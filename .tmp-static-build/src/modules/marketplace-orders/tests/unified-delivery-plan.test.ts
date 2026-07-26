import assert from "node:assert/strict";

import { createMemoryMarketplaceDb } from "../db/test-client";
import { MarketplaceOrderService } from "../services/marketplace-order-service";

async function createTwoSellerOrder(
  service: MarketplaceOrderService,
  buyer: { id: string; role: "buyer" },
  suffix: string,
) {
  const order = await service.createProductOrder(
    { currency: "EGP", deliveryAddress: { city: "Suez" } },
    buyer,
  );
  const first = await service.addOrderItem(
    String(order.id),
    {
      sellerId: `seller-a-${suffix}`,
      serviceProviderId: `original-a-${suffix}`,
      productId: `product-a-${suffix}`,
      productName: "First",
      quantity: 1,
      unitPrice: 10_000,
      shipping: 0,
    },
    buyer,
  );
  const second = await service.addOrderItem(
    String(order.id),
    {
      sellerId: `seller-b-${suffix}`,
      serviceProviderId: `original-b-${suffix}`,
      productId: `product-b-${suffix}`,
      productName: "Second",
      quantity: 1,
      unitPrice: 20_000,
      shipping: 0,
      requiresSpecialVehicle: true,
    },
    buyer,
  );
  return { order, first, second };
}

async function main() {
  const db = createMemoryMarketplaceDb();
  const service = new MarketplaceOrderService(db);
  const buyer = { id: "unified-buyer", role: "buyer" as const };
  const provider = {
    id: "unified-provider",
    role: "service_provider" as const,
  };
  const providerTwo = {
    id: "unified-provider-two",
    role: "service_provider" as const,
  };
  const outsider = {
    id: "unified-outsider",
    role: "service_provider" as const,
  };
  const admin = { id: "unified-admin", role: "admin" as const };
  const { order, first, second } = await createTwoSellerOrder(
    service,
    buyer,
    "main",
  );

  const plan = await service.createUnifiedDeliveryPlan(
    String(order.id),
    {
      stops: [
        {
          sellerOrderId: first.seller_order_id,
          sellerId: first.seller_id,
          originalCarrierId: "original-a-main",
          pickupAddress: { address: "A" },
          requiresLocationQuote: false,
          fallbackShippingPrice: 4_000,
          fallbackSpecialVehicleFee: 0,
          requiresSpecialVehicle: false,
        },
        {
          sellerOrderId: second.seller_order_id,
          sellerId: second.seller_id,
          originalCarrierId: "original-b-main",
          pickupAddress: { address: "B" },
          requiresLocationQuote: true,
          fallbackShippingPrice: 1_000,
          fallbackSpecialVehicleFee: 1_000,
          requiresSpecialVehicle: true,
        },
      ],
      candidates: [
        {
          providerId: provider.id,
          source: "linked",
          coverageScore: 2,
        },
        {
          providerId: providerTwo.id,
          source: "qualified_network",
          coverageScore: 0,
        },
      ],
    },
    buyer,
  );
  assert.equal(plan.status, "collecting_quotes");
  assert.equal(plan.fallback_confirmed_price, 5_000);
  assert.equal(plan.fallback_has_pending_quotes, 1);
  assert.equal(plan.special_vehicle_required, 1);
  assert.equal(
    (
      await db.execute(
        "SELECT COUNT(*) count FROM delivery_plan_candidates WHERE plan_id=?",
        [plan.id],
      )
    )[0].count,
    2,
  );
  await assert.rejects(
    () =>
      service.registerPayment(
        String(order.id),
        {
          buyerId: buyer.id,
          method: "cash_on_delivery",
          amount: 100,
          currency: "EGP",
        },
        buyer,
      ),
    /must be resolved/,
  );

  await service.sellerAcceptItem(String(first.id), {
    id: String(first.seller_id),
    role: "seller",
  });
  await assert.rejects(
    () =>
      service.sellerMarkItemPreparing(String(first.id), {
        id: String(first.seller_id),
        role: "seller",
      }),
    /Unified delivery plan must be accepted/,
  );
  await assert.rejects(
    () =>
      service.proposeUnifiedDeliveryQuote(
        String(plan.id),
        { baseShippingPrice: 7_000, specialVehicleFee: 1_000 },
        outsider,
      ),
    /Forbidden/,
  );

  const firstQuote = await service.proposeUnifiedDeliveryQuote(
    String(plan.id),
    {
      baseShippingPrice: 6_000,
      specialVehicleFee: 1_000,
      notes: "Two pickup stops",
    },
    provider,
  );
  assert.equal(firstQuote.total_shipping_price, 7_000);
  await assert.rejects(
    () =>
      service.proposeUnifiedDeliveryQuote(
        String(plan.id),
        { baseShippingPrice: 5_000, specialVehicleFee: 500 },
        provider,
      ),
    /already pending/,
  );
  const competingQuote = await service.proposeUnifiedDeliveryQuote(
    String(plan.id),
    { baseShippingPrice: 6_500, specialVehicleFee: 0 },
    providerTwo,
  );
  assert.equal(competingQuote.total_shipping_price, 6_500);

  await service.rejectUnifiedDeliveryQuote(String(firstQuote.id), buyer);
  const revised = await service.proposeUnifiedDeliveryQuote(
    String(plan.id),
    { baseShippingPrice: 5_000, specialVehicleFee: 500 },
    provider,
  );
  assert.equal(revised.version, 2);
  assert.equal(revised.total_shipping_price, 5_500);
  await service.acceptUnifiedDeliveryQuote(String(revised.id), buyer);

  const pricedItems = await db.execute(
    "SELECT shipping_price FROM order_items WHERE order_id=? ORDER BY created_at,id",
    [order.id],
  );
  assert.equal(
    pricedItems.reduce((total, item) => total + Number(item.shipping_price), 0),
    5_500,
  );
  const acceptedQuotes = await db.execute(
    "SELECT * FROM delivery_plan_quotes WHERE plan_id=? AND status='accepted'",
    [plan.id],
  );
  assert.equal(acceptedQuotes.length, 1);
  assert.equal(acceptedQuotes[0].provider_id, provider.id);
  const rejectedCompetitor = (
    await db.execute("SELECT * FROM delivery_plan_quotes WHERE id=?", [
      competingQuote.id,
    ])
  )[0];
  assert.equal(rejectedCompetitor.status, "rejected");
  const sellerOrders = await db.execute(
    "SELECT service_provider_id FROM seller_orders WHERE order_id=?",
    [order.id],
  );
  assert.ok(
    sellerOrders.every(
      (sellerOrder) => sellerOrder.service_provider_id === provider.id,
    ),
  );

  await service.sellerMarkItemPreparing(String(first.id), {
    id: String(first.seller_id),
    role: "seller",
  });
  await service.sellerMarkItemReadyForShipping(String(first.id), {
    id: String(first.seller_id),
    role: "seller",
  });
  await service.sellerAcceptItem(String(second.id), {
    id: String(second.seller_id),
    role: "seller",
  });
  await service.sellerMarkItemPreparing(String(second.id), {
    id: String(second.seller_id),
    role: "seller",
  });
  await service.sellerMarkItemReadyForShipping(String(second.id), {
    id: String(second.seller_id),
    role: "seller",
  });
  await assert.rejects(
    () =>
      service.createSellerOrderShipment(
        String(order.id),
        { sellerOrderId: String(first.seller_order_id) },
        admin,
      ),
    /unified delivery shipment/,
  );
  const shipment = await service.createUnifiedDeliveryShipment(
    String(plan.id),
    admin,
  );
  assert.equal(shipment.carrier_id, provider.id);
  assert.equal(shipment.final_shipping_price, 5_500);
  assert.equal(
    (
      await db.execute("SELECT * FROM shipment_items WHERE shipment_id=?", [
        shipment.id,
      ])
    ).length,
    2,
  );
  assert.equal(
    (
      await db.execute("SELECT status FROM delivery_plans WHERE id=?", [
        plan.id,
      ])
    )[0].status,
    "completed",
  );

  const fallbackOrder = await createTwoSellerOrder(service, buyer, "fallback");
  const fallbackPlan = await service.createUnifiedDeliveryPlan(
    String(fallbackOrder.order.id),
    {
      stops: [
        {
          sellerOrderId: fallbackOrder.first.seller_order_id,
          sellerId: fallbackOrder.first.seller_id,
          originalCarrierId: "original-a-fallback",
          pickupAddress: { address: "A" },
          requiresLocationQuote: false,
          fallbackShippingPrice: 4_000,
          fallbackSpecialVehicleFee: 0,
        },
        {
          sellerOrderId: fallbackOrder.second.seller_order_id,
          sellerId: fallbackOrder.second.seller_id,
          originalCarrierId: "original-b-fallback",
          pickupAddress: { address: "B" },
          requiresLocationQuote: true,
          fallbackShippingPrice: 1_000,
          fallbackSpecialVehicleFee: 1_000,
        },
      ],
      candidates: [
        {
          providerId: provider.id,
          source: "linked",
          coverageScore: 1,
        },
      ],
    },
    buyer,
  );
  await service.chooseSeparateDelivery(String(fallbackPlan.id), buyer);
  const fallbackItems = await db.execute(
    "SELECT seller_order_id,shipping_price FROM order_items WHERE order_id=?",
    [fallbackOrder.order.id],
  );
  assert.equal(
    fallbackItems.reduce(
      (total, item) => total + Number(item.shipping_price),
      0,
    ),
    5_000,
  );
  assert.equal(
    (
      await db.execute(
        "SELECT COUNT(*) count FROM shipping_quotes WHERE order_id=?",
        [fallbackOrder.order.id],
      )
    )[0].count,
    1,
  );

  const changedOrder = await createTwoSellerOrder(service, buyer, "changed");
  const changedPlan = await service.createUnifiedDeliveryPlan(
    String(changedOrder.order.id),
    {
      stops: [
        {
          sellerOrderId: changedOrder.first.seller_order_id,
          sellerId: changedOrder.first.seller_id,
          originalCarrierId: "original-a-changed",
          pickupAddress: { address: "A" },
          requiresLocationQuote: false,
          fallbackShippingPrice: 4_000,
          fallbackSpecialVehicleFee: 0,
        },
        {
          sellerOrderId: changedOrder.second.seller_order_id,
          sellerId: changedOrder.second.seller_id,
          originalCarrierId: "original-b-changed",
          pickupAddress: { address: "B" },
          requiresLocationQuote: false,
          fallbackShippingPrice: 5_000,
          fallbackSpecialVehicleFee: 1_000,
          requiresSpecialVehicle: true,
        },
      ],
      candidates: [
        {
          providerId: provider.id,
          source: "linked",
          coverageScore: 2,
        },
      ],
    },
    buyer,
  );
  const changedQuote = await service.proposeUnifiedDeliveryQuote(
    String(changedPlan.id),
    { baseShippingPrice: 6_000, specialVehicleFee: 1_000 },
    provider,
  );
  await service.acceptUnifiedDeliveryQuote(String(changedQuote.id), buyer);
  await service.cancelOrderItem(
    String(changedOrder.first.id),
    "seller removed from route",
    buyer,
  );
  const repricedPlan = (
    await db.execute("SELECT * FROM delivery_plans WHERE id=?", [
      changedPlan.id,
    ])
  )[0];
  assert.equal(repricedPlan.status, "reprice_required");
  assert.equal(repricedPlan.seller_count, 1);
  assert.equal(repricedPlan.fallback_confirmed_price, 5_000);
  assert.equal(
    (
      await db.execute(
        "SELECT SUM(shipping_price) shipping FROM order_items WHERE order_id=? AND status NOT IN ('buyer_cancelled','seller_rejected','admin_cancelled','closed')",
        [changedOrder.order.id],
      )
    )[0].shipping,
    0,
  );
  const oneStopQuote = await service.proposeUnifiedDeliveryQuote(
    String(changedPlan.id),
    { baseShippingPrice: 4_000, specialVehicleFee: 500 },
    provider,
  );
  await service.acceptUnifiedDeliveryQuote(String(oneStopQuote.id), buyer);
  assert.equal(
    (
      await db.execute(
        "SELECT SUM(shipping_price) shipping FROM order_items WHERE order_id=? AND status NOT IN ('buyer_cancelled','seller_rejected','admin_cancelled','closed')",
        [changedOrder.order.id],
      )
    )[0].shipping,
    4_500,
  );

  const hybridOrder = await createTwoSellerOrder(service, buyer, "hybrid");
  const hybridPlan = await service.createUnifiedDeliveryPlan(
    String(hybridOrder.order.id),
    {
      stops: [
        {
          sellerOrderId: hybridOrder.first.seller_order_id,
          sellerId: hybridOrder.first.seller_id,
          originalCarrierId: provider.id,
          pickupAddress: { address: "A" },
          requiresLocationQuote: false,
          fallbackShippingPrice: 4_000,
          fallbackSpecialVehicleFee: 0,
          requiresSpecialVehicle: false,
        },
        {
          sellerOrderId: hybridOrder.second.seller_order_id,
          sellerId: hybridOrder.second.seller_id,
          originalCarrierId: providerTwo.id,
          pickupAddress: { address: "B" },
          requiresLocationQuote: false,
          fallbackShippingPrice: 5_000,
          fallbackSpecialVehicleFee: 1_000,
          requiresSpecialVehicle: true,
        },
      ],
      candidates: [
        {
          providerId: provider.id,
          source: "linked",
          coverageScore: 1,
          sellerIds: [hybridOrder.first.seller_id],
        },
        {
          providerId: providerTwo.id,
          source: "linked",
          coverageScore: 1,
          sellerIds: [hybridOrder.second.seller_id],
        },
      ],
    },
    buyer,
  );
  await assert.rejects(
    () =>
      service.proposeUnifiedDeliveryQuote(
        String(hybridPlan.id),
        { baseShippingPrice: 3_000, specialVehicleFee: 100 },
        provider,
      ),
    /not allowed/,
  );
  const hybridFirstQuote = await service.proposeUnifiedDeliveryQuote(
    String(hybridPlan.id),
    { baseShippingPrice: 3_000, specialVehicleFee: 0 },
    provider,
  );
  const hybridSecondQuote = await service.proposeUnifiedDeliveryQuote(
    String(hybridPlan.id),
    { baseShippingPrice: 3_500, specialVehicleFee: 500 },
    providerTwo,
  );
  const partialHybrid = await service.acceptUnifiedDeliveryQuote(
    String(hybridFirstQuote.id),
    buyer,
  );
  assert.equal(partialHybrid.status, "pending_buyer");
  assert.equal(partialHybrid.strategy, "hybrid");
  assert.equal(
    (
      await db.execute(
        "SELECT SUM(shipping_price) shipping FROM order_items WHERE order_id=?",
        [hybridOrder.order.id],
      )
    )[0].shipping,
    0,
  );
  const completeHybrid = await service.acceptUnifiedDeliveryQuote(
    String(hybridSecondQuote.id),
    buyer,
  );
  assert.equal(completeHybrid.status, "accepted");
  assert.equal(completeHybrid.strategy, "hybrid");
  assert.equal(
    (
      await db.execute(
        "SELECT SUM(shipping_price) shipping FROM order_items WHERE order_id=?",
        [hybridOrder.order.id],
      )
    )[0].shipping,
    7_000,
  );
  for (const item of [hybridOrder.first, hybridOrder.second]) {
    const seller = { id: String(item.seller_id), role: "seller" as const };
    await service.sellerAcceptItem(String(item.id), seller);
    await service.sellerMarkItemPreparing(String(item.id), seller);
    await service.sellerMarkItemReadyForShipping(String(item.id), seller);
  }
  await service.createUnifiedDeliveryShipment(String(hybridPlan.id), admin);
  const hybridShipments = await db.execute(
    "SELECT s.carrier_id FROM shipments s JOIN delivery_plan_shipments dps ON dps.shipment_id=s.id WHERE dps.plan_id=? ORDER BY s.carrier_id",
    [hybridPlan.id],
  );
  assert.deepEqual(
    hybridShipments.map((shipment) => shipment.carrier_id),
    [provider.id, providerTwo.id].sort(),
  );

  console.log(
    "unified delivery plan: candidates, competing quotes, unified/hybrid choice, single fees, route repricing, fallback, and multi-seller shipments verified",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
