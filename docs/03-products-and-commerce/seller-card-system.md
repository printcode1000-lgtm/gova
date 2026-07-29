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

Public search, category-seller, and doctor-seller variants integrate with the device-local Favorites module. Linked-provider and compact cards keep favorites hidden by default.

## Architecture

```text
UserProfileRow
      |
      v
src/features/seller-card
      |
      v
SellerCardViewModel
      |
      v
src/components/ui/seller-card/SellerCard
```

The feature module converts profile rows into a display model. The UI component renders that model using a variant selected by the host page.

## Files

- `src/features/seller-card/entities/seller-card.types.ts`
  Defines variants, badges, actions, and the `SellerCardViewModel`.

- `src/features/seller-card/services/seller-card-presenter.ts`
  Converts `UserProfileRow` into a safe card view model.

- `src/features/seller-card/index.ts`
  Public feature exports.

- `src/components/ui/seller-card/SellerCard.tsx`
  Shared seller card UI component.

- `src/components/ui/seller-card/index.ts`
  Public UI export.

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

- `title` from `storeDetailsJson.storeName`, falling back to `uid`.
- `description` from store description or story.
- `avatarUrl` from available avatar URL fields when present.
- `initials` from the display name when no image exists.
- `href` as the canonical public profile URL:

```text
/profile?mode=view&uid=...
```

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
  { kind: "view", label: "عرض البروفايل", onClick: openProfile },
  { kind: "select", label: "تحديد", tone: "primary", onClick: selectProvider },
];
```

## Current Integrations

The system is currently used by:

- Category sellers page.
- Doctor appointment sellers page.
- General search seller results.
- Linked delivery providers in profile fulfillment settings.

## Responsibilities

The seller-card feature module is responsible for:

- Safe JSON parsing.
- Store/provider name fallback.
- Avatar fallback.
- Canonical profile URL.
- Optional badges.
- Rating text when rating data is available.

The UI component is responsible for:

- Rendering layout variants.
- Rendering image or initials fallback.
- Rendering badges.
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
