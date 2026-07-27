# Location-Based Shipping Quotes

## Profile configuration

Shipping pricing has three modes:

- `free`: the base shipping price is zero.
- `flat`: the configured flat rate is known before order submission.
- `by_location`: no estimated numeric location rate is stored. The real base shipping price is quoted after the order is created.

`freeShippingThreshold` makes the base shipping price free when the seller subtotal reaches the configured amount. `specialVehicleFee` is independent: it is charged only when at least one product in that seller order has `requires_special_vehicle`, including when the base price is free.

The old `shipping_location_base_rate` profile column remains only as a database compatibility column and is always written as zero. Runtime domain models and UI do not read it.

The cart and the server route share `calculateSellerShipping` as the single pricing rule. The cart therefore shows only confirmed fees and labels the order total as provisional whenever a location quote is still required.

## Quote lifecycle

One `shipping_quotes` row is created for each seller order that uses `by_location` and does not qualify for free base shipping.

```text
requested
  -> pending_buyer
      -> accepted
      -> rejected -> pending_buyer (new version)
```

- The assigned seller, assigned service provider, or an administrator may propose the base shipping value.
- The special-vehicle fee is captured from the cart calculation and cannot be changed by the proposer.
- Only the order buyer or an administrator may accept or reject.
- A rejected offer remains in history. A revision creates the next version.
- At most one pending and one accepted quote can exist for a seller order.
- Cancelling all active product items cancels unresolved quotes.

Acceptance writes the exact `base_shipping_price + special_vehicle_fee` into one active product item and recalculates item, seller-order, and order totals. This keeps existing aggregate calculators as the source of truth.

## Processing gate

For seller orders with a quote request, product preparation, readiness, and seller-order shipment creation are blocked until a quote is accepted. Orders using free or flat base shipping have no quote request and continue through the normal flow.

## Notifications and UI

The order details page displays the current quote, fee breakdown, notes, version, and state. Sellers/providers can submit a quote; buyers can accept or reject it. Each transition sends a deduplicated high-priority notification whose deep link opens the order with the appropriate buyer or seller role.

Notification content is still governed by the notification system: delivery tokens may be server-side, while received notification content is retained only in local AsolDB on the user device.

## Verification

- `npm run test:shipping-pricing` covers free, flat, threshold, location quote, and special-vehicle combinations.
- `shipping-quotes.test.ts` covers ownership, provider/seller permissions, duplicate prevention, rejection and revision, buyer acceptance, aggregate pricing, processing gates, shipment creation, and audit records.
- `schema-contract.test.ts` verifies the table, service methods, and status enum.
