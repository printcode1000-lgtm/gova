# Local Favorites System

## Purpose

The Favorites module gives guests and signed-in users a private, device-local list of saved products and sellers. It works in the browser and in Capacitor WebViews on every supported platform. It does not call an API and never writes favorite data to Turso or any cloud service.

## Architecture

```text
ProductCard / SellerCard / BottomNavBar / FavoritesPage
                         |
                         v
              src/features/favorites
                         |
                         v
              AsolDB `favorites` store
```

The module owns the entity model, collection operations, AsolDB repository, React provider, card adapters, favorite button, feedback message, and undo behavior.

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

Favorites are deliberately separate from the Follow System. A seller favorite is private: it does not change follower counts and does not subscribe the user to future notifications.

## UI Rules

- The bottom-navigation heart is filled whenever the active local collection contains at least one item, regardless of the current route.
- Product favorites appear on public search and profile-preview cards. Featured-marquee cards intentionally hide the favorite control.
- Seller favorites appear on public search, category-seller, and doctor-seller cards.
- Favorites are hidden from product management, compact cards, and linked-provider selection cards.
- The favorite control is a sibling of the card's open button, never a nested interactive element.
- Adding and removing are optimistic and persisted to AsolDB. Removal offers a four-second undo action.
- `/favorites` contains separate product and seller tabs with local counts, newest-first ordering, shared cards, and empty states.

## Files

- `src/features/favorites/entities/favorite.entity.ts`
- `src/features/favorites/services/favorite-collection.ts`
- `src/features/favorites/services/favorite-storage.ts`
- `src/features/favorites/services/favorite-card-adapter.ts`
- `src/features/favorites/hooks/FavoritesProvider.tsx`
- `src/features/favorites/components/FavoriteButton.tsx`
- `src/features/favorites/tests/favorites.test.ts`
- `src/app/favorites/page.tsx`

## Verification

```bash
npm run test:favorites
npm run typecheck
```
