# Pricing, Payments, and Refunds

## Pricing levels

Catalog item totals include unit price, quantity, item and coupon discounts, shipping, shipping discount, tax, service fee, commission, paid, refunded, and remaining amounts.

Custom request totals additionally support seller-estimated/final price, special vehicle fee, and handling fee. Shipment totals include base shipping, handling, special vehicle, insurance, discount, tax, and final shipping price.

Seller-order aggregation calculates subtotal, discount, shipping, tax, commission, grand total, and payout. Order aggregation calculates subtotal, item discount, order discount, shipping, shipping discount, tax, service/platform fees, grand total, paid, refunded, and remaining totals.

For `by_location`, the cart stores no guessed base rate. It creates a seller-order quote request and shows only already-confirmed fees. The accepted quote total is applied to an active catalog item, after which the standard seller-order and order aggregations recalculate. A free-shipping threshold removes the base rate, but a special-vehicle fee remains when an item requires a vehicle.

For multi-seller unified delivery, shipping remains zero until accepted quote
groups cover every active seller stop. Each quote total is applied once inside
its scope, so a unified plan charges one route and a hybrid plan charges one
route per accepted group rather than one fee per seller. Payment registration
is rejected while the plan is unresolved. Separate fallback values are
comparison data only until the buyer explicitly selects that strategy.

## Calculation safety

No calculation uses decimal currency values. Inputs must be non-negative JavaScript safe integers. Multiplication and addition are checked for safe integer overflow. Discounts cannot make a total negative.

## Payments

`registerPayment` supports electronic payment, cash on delivery, wallet, and bank transfer. Provider and provider transaction data may be retained. `markPaymentFailed` records a failed attempt and audits the transition.

## Refunds

Refunds are independent records and may reference a payment, catalog item, custom request item, or return request. `createRefund` verifies that the requested amount does not exceed paid value after previous executed refunds. `executeRefund` records execution, recalculates order totals, and creates an audit event. Multiple refund records provide partial refund support.

## The catalogue is authoritative for cart prices

`POST /api/orders/from-cart` ignores the `unitPriceMinor`, `sellerId`, and
`name` in the request body. It reads each product from the products database and
uses the stored values instead.

This is not defensive style — it closes a real hole. The only other check was
`moneyMinor`, which asserts a non-negative integer and nothing about *which*
product it belongs to. A modified client could therefore order a 10,000 EGP item
for 1 EGP, with the seller's acceptance step as the only thing standing in the
way.

Resolution happens before discounts and delivery are calculated, so those run on
catalogue numbers rather than on whatever arrived in the request.

| Case | Behaviour |
|---|---|
| Price changed since the cart was filled | Corrected silently — the buyer who left a tab open is charged the current price rather than losing the order |
| Item priced on request (non-empty `price_label`) | Passes through as `0` plus its label, unchanged |
| Price text blank or malformed | Treated as price-on-request, never as zero |
| Product archived or missing | Order fails with `productUnavailable` |

Resolver: `src/features/cart/server/services/cart-catalogue-pricing.server.ts`.
Enforced by `src/features/cart/tests/cart-catalogue-pricing.test.ts`, which
fails if the route stops overwriting the client's values.
