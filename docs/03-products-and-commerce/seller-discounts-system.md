# Seller Discounts System

## Purpose

The Seller Discounts System gives each seller calculable offer rules that are
managed in the profile editor, advertised in the public profile, previewed in
the cart, and recalculated authoritatively during checkout. Display text is
never the pricing source of truth.

## Supported discount types

- `order_total`: percentage or fixed discount on the seller cart subtotal.
- `quantity`: applies after `buyQuantity` is reached. When `getQuantity > 0`,
  the benefit is calculated on the cheapest eligible units in each complete
  group; `getQuantity = 0` applies the value to the whole eligible scoped set.
- `bundle`: requires every `bundleProductId`. A fixed bundle price is calculated
  only from those required products, one unit of each per complete bundle group;
  unrelated cart products never enter the bundle base.
- `free_shipping`: removes that seller's confirmed shipping charge.
- `coupon`: requires a seller-local coupon code, compared case-insensitively.
- `free_gift`: adds the seller-owned gift product as a zero-priced order item.
- `automatic`: applies its configured value when its scope and conditions pass.

Percent values are normalized to `0..100`. Monetary values stay integer minor
units in the domain and database and are converted to/from Egyptian pounds only
at the editor boundary.

## Eligibility and stacking

A rule may constrain product ids, main-category ids, excluded products, minimum
subtotal, minimum quantity, date range, total/per-buyer usage, first order,
followers, native-app users, or coupon entry. The pricing engine evaluates rules
per seller in a multi-seller cart.

Higher `priority` values are evaluated first. Combinable eligible rules are
stacked. Non-combinable rules compete as single alternatives; the engine uses
the better effective result. A non-monetary free gift still counts as a real
benefit, so a non-combinable gift does not disappear merely because its numeric
discount is zero. Equal monetary alternatives are resolved by higher priority.

Usage limits are read from `seller_discount_usages`. Checkout records every
applied rule after a successful order is created.

## Profile editor

Route: `/profile?mode=edit`.

`SellerDiscountsManager` supports all rule types, status, priority, combinability,
dates, limits, scopes, coupons and audience conditions. Quantity offers expose
both purchase quantity and discounted quantity. The discounted-quantity field
keeps a source-defined identity with a permanent six-character suffix. Deletion uses the shared
confirmation surface, while the actual persisted removal still participates in
the unified profile save flow.

Saving inactive/draft rules is authenticated. `GET /api/profile/discounts` with
`includeInactive=1` and `PUT /api/profile/discounts` are served by `sub2main`,
which owns the session-signing capability. The seller id used for a write comes
from the verified `x-asol-session-token`; a caller cannot save rules for a uid
provided in the request body.

Every referenced product id (included, excluded, bundle or gift) is resolved
through the catalogue before save and must belong to that seller. This prevents
a rule from gifting or scoping another seller's product.

## Public buyer preview

Route: `/profile?mode=preview`.

The public profile loads active rules only. Active-only reads remain public and
show readable conditions, validity, limits, audience, scope and coupon details.
The preview is informational; it never performs final pricing locally.

## Cart quote

The cart calls `POST /api/profile/discounts/quote`. The server discards pricing
and ownership facts supplied by the browser and resolves the current catalogue
record for every product. The authoritative values are:

- seller id,
- product name,
- unit price,
- main category id,
- special-vehicle requirement where relevant to checkout.

Quantity must be a positive safe integer. This prevents a modified or stale cart
from inventing a price, seller, category, or invalid quantity to qualify for a
promotion.

When a signed session is present, the quote derives `buyerUid`, first-order
status and follower status on the server. Follower eligibility is calculated per
seller through the public `@/features/follow/server` door. App-only eligibility is derived from supported native WebView origins,
not from a boolean supplied by the browser. Coupon strings are the only buyer
promotion input intentionally accepted by the quote.

A guest can receive a public quote, but cannot impersonate authenticated
first-order or follower context.

## Checkout source of truth

`POST /api/orders/from-cart` requires a signed session. It does not accept buyer
uid or phone as authority. Buyer identity comes from the verified session and
profile/auth data.

Before discount calculation the checkout route re-resolves catalogue price,
seller, product name and main category, validates quantity, then derives:

- whether the buyer has any previous marketplace order,
- whether the buyer follows each seller,
- whether the request originates from a supported native app surface.

The quote is recalculated with those server-derived facts. Applied product/order
discounts become `itemDiscount`; free shipping becomes `shippingDiscount`; gift
offers create a zero-priced order item. The cart preview is therefore never
trusted as the official order price.

## Persistence

Promotion tables live in the `profile-promotions` shard:

```text
seller_discounts
seller_discount_usages
```

Core migration: `packages/data-core/src/core/database/profile/migrations/0012_seller_discounts.sql`.
Coupon uniqueness migration: `packages/data-core/src/core/database/profile/migrations/0017_seller_discount_coupon_unique.sql`.
Desired schema: `packages/data-core/src/provisioning/desired-schema/profile-promotions.ts`.
Drizzle schema: `packages/data-core/src/core/database/profile/profile.schema.ts`.

Non-empty coupon codes are normalized to uppercase and are unique on
`(seller_uid, coupon_code)`. Application validation rejects duplicates before a
write and the database partial unique index is the concurrency backstop.

Seller saves use one libSQL/Turso write batch on the owning shard. Existing ids
are upserted, removed ids are deleted in the same atomic batch, and `created_at`
is preserved on update. The old delete-all-then-insert sequence is forbidden
because a mid-save failure could otherwise leave a seller with partial rules.

## Main source map

```text
src/features/seller-discounts/
  domain/seller-discount.entity.ts
  application/services/seller-discount-engine.ts
  application/services/seller-discount-api-service.ts
  server/services/seller-discount-service.server.ts
  presentation/SellerDiscountsManager.tsx
  presentation/SellerDiscountsPreview.tsx
  presentation/hooks/use-seller-discounts.ts
  presentation/hooks/use-cart-discount-quote.ts
packages/data-core/src/domains/seller-discounts/
  entities/seller-discount.entity.ts
  repositories/seller-discount-repository.ts
src/app/api/profile/discounts/route.ts
src/app/api/profile/discounts/quote/route.ts
src/app/api/orders/from-cart/route.ts
```

## Invariants

- UI never calculates the official discount result.
- Checkout always recalculates server-side from authoritative catalogue data.
- Seller write identity always comes from a verified signed session.
- First-order, follower and app-only eligibility are server-derived.
- Product references in a seller rule must belong to that seller.
- Bundle pricing never includes products outside the declared bundle.
- Percentage discounts can never exceed the eligible base.
- Coupon codes are seller-local and unique when non-empty.
- Discount definition replacement is atomic and preserves creation time.
- Multi-seller carts are evaluated independently per seller.

## Regression tests

Run the focused promotion suite with:

```bash
npm run test:seller-discounts
npm run test:cart-pricing
```

The seller-discounts suite covers engine semantics (gift, bundle, quantity,
audience, dates, usage, stacking and priority), repository atomicity/normalization
and source security contracts. Broader gates that protect the surrounding
architecture are `npm run test:data-core`, `npm run test:account-bridge`,
`npm run test:route-ownership`, `npm run architecture:check`, `npm run typecheck`
and `npm run services:verify` after `npm run services:sync`.
