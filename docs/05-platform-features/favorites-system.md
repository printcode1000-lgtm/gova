# Local Favorites System

## Purpose

The Favorites module gives guests and signed-in users a private, device-local list of saved products and sellers. It works in the browser and in Capacitor WebViews on every supported platform. It does not call an API and never writes favorite data to Turso or any cloud service.

## Architecture

```text
ProductCard / SellerCard / BottomNavBar / FavoritesPage
                         |
                         v
              @asol/favorites-core
                         |
                         v
              AsolDB `favorites` store
```

The sealed package owns the entity model, collection operations, AsolDB
repository, React provider, card adapters, favorite button, feedback message,
and undo behavior. It knows nothing about sessions, the Follow System, or system
logs: `src/features/favorites` wires those in as host-owned props.

## Public Doors

| Door | Contents |
|---|---|
| `@asol/favorites-core` | Favorite entity types, `favoriteKey`, and the product/seller card adapters |
| `@asol/favorites-core/ui` | `FavoriteButton`, `FavoritesProvider`, `useFavorites` |

## Host Wiring

`FavoritesProvider` takes everything application-specific as props:

- `viewerUid` / `isViewerLoading` — the signed-in viewer, or null for a guest.
- `onSellerFollowChange` — the public Follow System mutation for seller favorites.
- `onFailure` — failure reporting.

`src/features/favorites` supplies all three from `FavoritesHostProvider`, and
renders `ProductCardFavoriteSlot` / `SellerCardFavoriteSlot` for pages to pass
into a card's `favoriteSlot` prop. Card packages never import favorites.

## Storage

AsolDB version 7 adds the `favorites` object store. Each stored collection uses one of these keys:

- `favorites:guest`
- `favorites:user:<uid>`

The records contain display snapshots rather than full product or profile records. A snapshot includes the target type/id, owner, title, subtitle, image, price/rating text, link, and timestamps.

Consequences of local-only storage:

- Favorites remain private to the current browser/app installation.
- They do not synchronize between devices.
- Clearing browser or application data removes them.
- No network connection is required to add, remove, list, or restore a favorite.

## Guest and Account Isolation

Guests write to the guest collection. Signed-in accounts write to a collection namespaced by uid. On login, the guest collection is merged once into that account on the same device and the guest collection is removed. Duplicate targets are collapsed by `type + targetId`.

## Supported Targets

- `product`
- `seller`

Adding a seller favorite for a signed-in user also creates a Follow System record for that store (increasing the seller's public follower count and enabling follower broadcasts to that user). Removing a seller favorite removes the follow record. This sync is best-effort, fire-and-forget, and never blocks or fails the local favorite toggle. It only fires going forward — it does not run for favorites saved before this behavior existed, and it never runs for guests (the Follow System requires a signed-in `viewerUid`) or when the viewer favorites their own store. Product favorites are unaffected; they have no relationship to the Follow System.

## UI Rules

- The bottom-navigation heart is filled whenever the active local collection contains at least one item, regardless of the current route.
- Product favorites appear on public search and profile-preview cards. Featured-marquee cards intentionally hide the favorite control.
- The product detail order section uses the same local favorite button and collection as product cards.
- Seller favorites appear on public search, category-seller, and doctor-seller cards. Because favoriting a seller also follows them, `SellerCardFavoriteSlot` renders `FavoriteButton` with `variant="follow"` (a person icon, not a heart) to avoid implying a plain like/save; product cards keep the default heart.
- Favorites are hidden from product management, compact cards, and linked-provider selection cards.
- The favorite control is a sibling of the card's open button, never a nested interactive element.
- Adding and removing are optimistic and persisted to AsolDB. Removal offers a four-second undo action.
- `/favorites` contains separate product and seller tabs with local counts, newest-first ordering, shared cards, and empty states.

## Files

- `packages/favorites-core/src/domain/favorite.entity.ts`
- `packages/favorites-core/src/application/favorite-collection.ts`
- `packages/favorites-core/src/application/favorite-storage.ts`
- `packages/favorites-core/src/application/favorite-card-adapter.ts`
- `packages/favorites-core/src/presentation/FavoritesProvider.tsx`
- `packages/favorites-core/src/presentation/FavoriteButton.tsx`
- `packages/favorites-core/src/tests/index.test.ts`
- `src/features/favorites/presentation/FavoritesHostProvider.tsx`
- `src/features/favorites/presentation/ProductCardFavoriteSlot.tsx`
- `src/features/favorites/presentation/SellerCardFavoriteSlot.tsx`
- `src/app/favorites/page.tsx`

## Verification

```bash
npm run test:favorites-core
npm run typecheck
```
