# Service API Reference

## Construction

Server code calls `getMarketplaceOrderService()` from `src/modules/marketplace-orders/api/server.ts`. Tests may construct `MarketplaceOrderService` with an injected `MarketplaceDb`.

## Order and item operations

- `createProductOrder`, `createCustomRequestOrder`, `createMixedOrder`
- `addOrderItem`, `addCustomRequestItem`, `addCustomRequestImage`
- `sellerAcceptItem`, `sellerRejectItem`
- `sellerAcceptCustomRequest`, `sellerRejectCustomRequest`
- `sellerSendPriceOfferForCustomRequest`
- `buyerAcceptCustomRequestPrice`, `buyerRejectCustomRequestPrice`

## Location shipping quote operations

- `requestShippingQuote`
- `proposeShippingQuote`
- `acceptShippingQuote`
- `rejectShippingQuote`

Quote requests are created for `by_location` cart groups. Sellers/providers propose, buyers decide, and processing/shipment gates require acceptance.

## Cancellation operations

- `cancelFullOrder`
- `cancelSellerOrder`
- `cancelOrderItem`
- `cancelCustomRequestItem`

## Shipment operations

- `createShipment`
- `assignOrderItemToShipment`, `assignCustomRequestItemToShipment`
- `carrierReceiveShipmentItem`, `carrierRejectShipmentItem`
- `markShipmentInTransit`, `markShipmentArrivedAtDistributionCenter`, `markShipmentOutForDelivery`
- `markShipmentItemDelivered`, `markShipmentItemDeliveryRejected`, `markShipmentItemDeliveryFailed`
- `markShipmentPartiallyDelivered`, `markShipmentFullyDelivered`
- `updateShipmentTracking`, `updateShipmentPricing`

## Financial operations

- `registerPayment`, `markPaymentFailed`
- `createRefund`, `executeRefund`
- `recalculateOrderPricing`, `recalculateSellerOrderPricing`, `recalculateShipmentPricing`

## After-sales and dispute operations

- `createReturnRequest`, `approveReturnRequest`, `rejectReturnRequest`
- `createReplacementRequest`, `approveReplacementRequest`, `rejectReplacementRequest`
- `openDispute`, `replyToDispute`, `adminResolveDispute`

## Status and audit operations

- `recalculateOrderStatus`
- `recalculateSellerOrderStatus`
- `recalculateShipmentStatus`
- `writeAuditLog` is the audit-layer function used by service orchestration.
- `adminUpdateOrder` applies an audited administrative metadata change without exposing calculated status.

Service methods throw domain errors for invalid state, ownership, money, and references. Business routes should translate forbidden errors to HTTP 403, missing entities to 404, conflicts/expired offers to 409, and validation errors to 400 or 422.
