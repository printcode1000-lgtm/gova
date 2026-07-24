# Pricing, Payments, and Refunds

## Pricing levels

Catalog item totals include unit price, quantity, item and coupon discounts, shipping, shipping discount, tax, service fee, commission, paid, refunded, and remaining amounts.

Custom request totals additionally support seller-estimated/final price, special vehicle fee, and handling fee. Shipment totals include base shipping, handling, special vehicle, insurance, discount, tax, and final shipping price.

Seller-order aggregation calculates subtotal, discount, shipping, tax, commission, grand total, and payout. Order aggregation calculates subtotal, item discount, order discount, shipping, shipping discount, tax, service/platform fees, grand total, paid, refunded, and remaining totals.

For `by_location`, the cart stores no guessed base rate. It creates a seller-order quote request and shows only already-confirmed fees. The accepted quote total is applied to an active catalog item, after which the standard seller-order and order aggregations recalculate. A free-shipping threshold removes the base rate, but a special-vehicle fee remains when an item requires a vehicle.

## Calculation safety

No calculation uses decimal currency values. Inputs must be non-negative JavaScript safe integers. Multiplication and addition are checked for safe integer overflow. Discounts cannot make a total negative.

## Payments

`registerPayment` supports electronic payment, cash on delivery, wallet, and bank transfer. Provider and provider transaction data may be retained. `markPaymentFailed` records a failed attempt and audits the transition.

## Refunds

Refunds are independent records and may reference a payment, catalog item, custom request item, or return request. `createRefund` verifies that the requested amount does not exceed paid value after previous executed refunds. `executeRefund` records execution, recalculates order totals, and creates an audit event. Multiple refund records provide partial refund support.
