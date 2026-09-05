# Seller Card System

## Purpose

The Seller Card System is the single presentation source for seller, doctor, service-provider, and delivery-provider cards across ASOL.

It prevents pages from duplicating logic for:

- Store/provider name.
- Avatar fallback.
- Profile URL.
- Description.
- Rating display.
- Context badges.
- Context actions.

Public search, category-seller, and doctor-seller variants show a follow/favorite
control. The package never imports Favorites: the host page renders the control
and passes it through the `favoriteSlot` prop. Linked-provider and compact cards
keep that slot hidden by default.

## Architecture

```text
UserProfileRow
      |
      v
@asol/seller-card-core
      |
      v
SellerCardViewModel
      |
      v
@asol/seller-card-core/ui → SellerCard
```

The sealed package converts profile rows into a display model. The UI component
renders that model using a variant selected by the host page. The package owns
no favorites, profile, or routing behavior; hosts pass actions and slots in.

## Public Doors

| Door | Contents |
|---|---|
| `@asol/seller-card-core` | Card types and `createSellerCardViewModel`, `sellerCardTitle`, `sellerCardAvatar` |
| `@asol/seller-card-core/ui` | `SellerCard` |

## Files

- `packages/seller-card-core/src/domain/seller-card.types.ts`
  Defines variants, badges, actions, and the `SellerCardViewModel`.

- `packages/seller-card-core/src/application/seller-card-presenter.ts`
  Converts `UserProfileRow` into a safe card view model.

- `packages/seller-card-core/src/index.ts`
  Domain and view-model door.

- `packages/seller-card-core/src/presentation/SellerCard.tsx`
  Shared seller card UI component.

- `packages/seller-card-core/src/ui.ts`
  Presentation door.

- `packages/seller-card-core/src/tests/index.test.ts`
  Presenter policy plus the package boundary contract, gated by
  `npm run test:seller-card-core`.

## Variants

- `search`
  Used in general search seller results.

- `category-sellers`
  Used in category seller listing pages.

- `doctor-sellers`
  Used in doctor appointment seller listing pages.

- `linked-provider`
  Used where a seller links another provider, such as delivery providers in fulfillment settings.

- `compact`
  Reserved for dense future surfaces.

## Data Model

The shared card receives a `SellerCardViewModel`:

```ts
interface SellerCardViewModel {
  uid: string;
  title: string;
  identityLabel: string;
  subtitle: string;
  description: string;
  avatarUrl: string;
  coverUrl: string;
  initials: string;
  href: string;
  ratingText: string;
  ratingValue: number | null;
  badges: SellerCardBadge[];
}
```

## Presenter Rules

The presenter safely derives:

- `title` from the canonical `storeName` field. Owned application and JSON
  transport contracts are camelCase-only; persistence column names never reach
  this presenter. A UID is never presented as a store name; cards omit the title
  when the profile has no store name.
- `identityLabel` from the store name, falling back to the original registration
  phone, then an available primary-phone field. The UID is never used as visible
  fallback identity text.
- `description` from the canonical `storeDescription` or `storeStory` fields.
- `avatarUrl` from available avatar URL fields when present.
- `initials` from the display name when no image exists.
- `href` as the canonical public profile URL:

```text
/profile?mode=view&uid=...
```

## Identity Element Contract

`features-seller-card-presentation-sellercard-div-10-cduns8` renders exactly one
visible value: `identityLabel`. It never renders UID, badges, or any other
secondary content. When both `storeName` and the original registration phone
are empty, the identity element is omitted.

## Actions

Actions are passed by the host page because permissions and behavior differ by context.

Supported action kinds:

- `view`
- `select`
- `remove`
- `contact`
- `custom`

Example:

```ts
const actions = [
  { kind: "view", label: "View Profile", onClick: openProfile },
  { kind: "select", label: "Select", tone: "primary", onClick: selectProvider },
];
```

## Current Integrations

The system is currently used by:

- Category sellers page.
- Doctor appointment sellers page.
- General search seller results.
- Linked delivery providers in profile fulfillment settings.

## Responsibilities

`@asol/seller-card-core` is responsible for:

- Safe JSON parsing.
- Store/provider identity presentation using store name with original-registration-phone fallback, without exposing UID as display text.
- Avatar fallback.
- Canonical profile URL.
- Optional badge data in the view model.
- Rating text when rating data is available.

The UI component is responsible for:

- Rendering layout variants.
- Rendering image or initials fallback.
- Rendering exactly one truncated identity-label line inside the card content.
- Rendering context actions.
- Avoiding nested interactive elements.

## Non-Responsibilities

The shared card does not:

- Fetch sellers.
- Decide permissions.
- Save profile data.
- Own search or pagination.
- Mutate fulfillment settings.
- Treat a private favorite as a social follow. Favorites and follows remain separate systems.

## Future Extensibility

Future variants can be added for:

- Super-admin user management.
- Order participant cards.
- Chat/contact cards.
- Recommended sellers.
- Nearby providers.
- Verified provider badges.
