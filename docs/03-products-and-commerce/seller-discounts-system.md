# Seller Discounts System

## Purpose

The Seller Discounts System gives every seller a complete offers module that is
managed from the profile editor and shown to buyers in the public profile and
cart. Discounts are stored as calculable rules, not display text.

## Supported discount types

- `order_total`: discount on the seller cart subtotal.
- `quantity`: discount when the selected product/category quantity reaches a threshold.
- `bundle`: discount when a set of products is bought together.
- `free_shipping`: removes the seller shipping charge when conditions match.
- `coupon`: requires one of the entered coupon codes.
- `free_gift`: adds a zero-priced gift product to the order.
- `automatic`: applies automatically from seller-defined conditions.

## Profile editor

Route:

```text
/profile?mode=edit
```

The profile carousel includes a new `discounts` tab labelled "Offers". It renders
`SellerDiscountsManager`, which lets the seller:

- Create all supported discount types.
- Edit title, value, priority, status, date range, usage limits, and combinability.
- Scope a discount by product ids, category ids, exclusions, bundle product ids,
  and gift product id.
- Add coupon codes and automatic conditions such as first order, followers, and
  app users.
- Save changes through the existing unified profile save bar.

All offer fields include localized examples and concise explanations. Monetary
fields are entered and displayed as Egyptian pounds (including two decimal
places) while the domain model and database continue to store integer minor
units; the editor performs the conversion at its boundary. Zero-value numeric
fields render empty so their examples remain visible until the seller enters a
constraint.

## Buyer preview

Route:

```text
/profile?mode=preview
```

The public profile renders `SellerDiscountsPreview` after profile metrics. It
shows only active seller offers, including coupon codes and readable conditions.
Each card also states who can benefit (all eligible customers, followers,
first-order buyers, app users, or a combination), product/category scope,
minimum quantity and exclusions, validity dates, usage limits, combinability,
and the seller-written description. Counts are shown instead of internal ids,
and monetary values are converted from minor units to Egyptian pounds.
The preview is informational; the source of truth remains the pricing engine.

## Cart and order flow

The cart calls:

```text
POST /api/profile/discounts/quote
```

with local cart items and buyer context. The server loads active discounts for
all sellers and calculates a seller-by-seller quote.

On order creation, `/api/orders/from-cart` recalculates the same quote server-side
and persists the result into marketplace order item pricing:

- Product/order discounts become `itemDiscount`.
- Free shipping becomes `shippingDiscount`.
- Gift offers add a zero-priced order item.
- Discount usage is recorded for total and per-buyer usage limits.

This means the cart display is not trusted blindly; checkout recalculates before
writing the official order.

## Database

Profile database tables:

```text
seller_discounts
seller_discount_usages
```

Migration:

```text
src/modules/data-access/core/database/profile/migrations/0012_seller_discounts.sql
```

Drizzle schema:

```text
src/modules/data-access/core/database/profile/profile.schema.ts
```

Discount definitions live in the profile database because they are seller-owned
profile/business settings. Applied pricing is written into marketplace order
tables during checkout.

## Source map

```text
src/features/seller-discounts/
  entities/seller-discount.entity.ts
  services/seller-discount-engine.ts
  services/seller-discount-service.server.ts
  services/seller-discount-api-service.ts
  repositories/seller-discount-repository.ts
  hooks/use-seller-discounts.ts
  hooks/use-cart-discount-quote.ts
  components/SellerDiscountsManager.tsx
  components/SellerDiscountsPreview.tsx
```

## Rules

- UI must not calculate final discounts locally.
- Cart preview may call the quote API, but checkout must recalculate server-side.
- Coupon codes are unique only within the seller context.
- Discounts are seller-level; multi-seller carts are calculated per seller.
- Non-combinable discounts compete against combinable discounts; the engine picks
  the better effective result.
- Usage limits are enforced through `seller_discount_usages`.
