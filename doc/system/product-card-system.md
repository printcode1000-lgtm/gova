# Product Card System

## Purpose

The Product Card System is the single presentation source for product cards across ASOL. It prevents each page from rebuilding its own card logic for product name, image, price, badges, rating, and navigation.

## Scope

The system is used by:

- Product search results.
- Profile product tabs in preview mode.
- Profile product tabs in edit mode.
- Home featured product marquee.

The card can be reused in future product strips, recommendations, cart suggestions, and seller dashboards without duplicating product display logic.

## Architecture

```text
ProductRecord / featured item
        |
        v
src/features/product-card
        |
        v
ProductCardViewModel
        |
        v
src/components/ui/product-card/ProductCard
```

The feature module prepares a display model. The UI component only renders the supplied model and actions.

## Files

- `src/features/product-card/entities/product-card.types.ts`
  Defines card variants, actions, badges, and the `ProductCardViewModel`.

- `src/features/product-card/services/product-card-presenter.ts`
  Converts product data into a card view model.

- `src/features/product-card/index.ts`
  Public module exports.

- `src/components/ui/product-card/ProductCard.tsx`
  The shared visual product card.

- `src/components/ui/product-card/index.ts`
  Public UI export.

## Data Flow

For normal products:

```ts
const card = createProductCardViewModel(product);
```

For home featured marquee items:

```ts
const card = createFeaturedProductCardViewModel(item);
```

The component receives:

```ts
<ProductCard
  card={card}
  variant="search"
  onOpen={() => router.push(card.href)}
/>
```

## Variants

- `search`
  Used in the full search page.

- `profile-preview`
  Used when visitors view seller products.

- `profile-edit`
  Used when the owner manages products from profile edit mode.

- `featured-marquee`
  Used in the animated home featured strip.

- `compact`
  Reserved for dense future surfaces.

## Actions

Actions are passed from the host page because permissions and behavior differ by context.

Supported action kinds:

- `view`
- `edit`
- `delete`
- `toggleFeatured`
- `addToCart`
- `favorite`
- `custom`

Example:

```ts
const actions = [
  { kind: "view", label: "عرض", onClick: () => onViewProduct(product) },
  { kind: "edit", label: "تعديل", onClick: () => onEditProduct(product) },
];
```

## Navigation

The presenter builds canonical product links:

```text
/product?mode=view&productId=...&mainCategoryId=...&subcategoryId=...
```

This avoids opening `/product?mode=view` without a valid product id.

## Image Handling

The card never renders an empty image source. If no image exists, it renders a package placeholder. External images that must bypass the Next.js optimizer use the existing `shouldUseUnoptimizedImage` helper.

## Responsibilities

The product-card feature module is responsible for:

- Product title fallback.
- Main image fallback.
- Price text fallback.
- Rating text formatting.
- Product badges.
- Canonical product href.

The UI component is responsible for:

- Rendering layout variants.
- Rendering image or placeholder.
- Rendering badges.
- Rendering context actions.
- Avoiding nested interactive elements.

## Non-Responsibilities

The shared card does not:

- Fetch products.
- Decide permissions.
- Save or mutate products.
- Own search, filtering, sorting, or profile tab state.
- Read route params directly.

## Integration Notes

Search uses `ProductCard` for result cards only. Search fields, filters, and seller result cards remain owned by the search module.

Profile product tabs use `ProductCard` for product rendering while keeping the existing tab state and edit actions.

Featured marquee keeps its existing scrolling behavior, but each item is rendered through the shared card.

## Future Extensibility

Future improvements can add:

- Cart-specific variant.
- Recommendation variant.
- Seller-dashboard variant.
- Inventory status indicators.
- Promotion labels.
- A/B visual configuration per category.
- Analytics hooks for impressions and clicks.

Any new product-card behavior should be added to the presenter or shared UI component first, then consumed by pages through the public exports.
