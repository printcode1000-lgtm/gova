# Reusable FeaturedMarquee Component Developer Guide

The `FeaturedMarquee` is a reusable, self-scrolling product showcase component designed for Next.js App Router applications. It displays an infinite horizontal marquee of product cards and has zero direct dependencies on feature-specific translations or business logic.

---

## Component Location
* Runtime contract and validation: `packages/featured-marquee-core/src`
* Component code: `src/shared/ui/FeaturedMarquee.tsx`
* Home cache and synchronization: `src/features/advertisements/presentation/hooks/use-home-featured-marquee.ts`
* Server adapter: `src/features/advertisements/server/services/featured-marquee-service.server.ts`

---

## Features
1. **Seamless Scrolling**: Auto-scrolls card items infinitely via standard CSS marquee keyframes.
2. **Action Callbacks**: Each item carries an `action` string. When a card is clicked (or activated via keyboard), the component fires `config.onAction(action)` — keeping routing logic entirely outside the component.
3. **Translation Independence**: Renders titles, prices, and header text exactly as supplied by the configuration JSON without calling any translation hooks.
4. **Accessibility**: Items are rendered as keyboard-focusable interactive elements with `role="button"`, `aria-label`, and keyboard `Enter`/`Space` support.
5. **Optimized Images**: Utilizes Next.js `Image` with auto CDN-unoptimization support for external image hosts.

---

## Configuration Model

The component accepts **exactly one prop**: `config`.

The persisted Home advertisement contract is owned by
`@asol/featured-marquee-core`; the React component receives already resolved UI
items and never talks to persistence directly.

### `FeaturedMarqueeConfig` Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `sectionTitle` | `string` | The header text displayed alongside the Sparkles icon. |
| `items` | `FeaturedMarqueeItem[]` | List of product cards to display in the marquee. |
| `onAction` | `(action: string) => void` | (Optional) Callback fired when a product card is clicked. |

### `FeaturedMarqueeItem` Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier for the item. |
| `title` | `string` | Product name displayed below the image. |
| `price` | `string` | Price string displayed at the bottom of the card. |
| `image` | `string` | Product image URL or local path. |
| `action` | `string` | Action identifier passed back to `onAction` when clicked. |

---

## Usage Example

### 1. Create a Configuration JSON File
Place a JSON file in the folder of your Screen component:

```json
{
  "sectionTitle": "Featured Products",
  "items": [
    {
      "id": "f1",
      "title": "Smart Watch",
      "price": "$299",
      "image": "https://example.com/watch.jpg",
      "action": "go-to-smart-watch"
    },
    {
      "id": "f2",
      "title": "Running Shoes",
      "price": "$120",
      "image": "https://example.com/shoes.jpg",
      "action": "go-to-running-shoes"
    }
  ]
}
```

### 2. Implement the Component on a Page

```tsx
'use client';

import { useMemo } from 'react';
import { FeaturedMarquee, type FeaturedMarqueeConfig } from '@/features/advertisements/presentation/FeaturedMarquee';
import marqueeData from './my-featured-marquee.json';

export default function MyScreen() {
  const marqueeConfig = useMemo<FeaturedMarqueeConfig>(
    () => ({
      sectionTitle: marqueeData.sectionTitle,
      items: marqueeData.items,
      onAction: (action) => {
        // Handle navigation or any logic here
        console.log('Item clicked:', action);
        // e.g., router.push(`/products/${action}`)
      },
    }),
    []
  );

  return (
    <div className="w-full">
      <FeaturedMarquee config={marqueeConfig} />
    </div>
  );
}
```

---

## Home Caching and Refresh

`use-home-featured-marquee.ts` keeps a cache entry under
`FEATURED_MARQUEE_CACHE_KEY` (`advertisements:featured-marquee:v2`) holding both
the published record and the resolved UI items.

* The cached items render immediately to avoid flicker.
* Server checks are skipped while inside the `checkIntervalMinutes` window.
* Once the window elapses, the lightweight version endpoint decides whether the
  full published config is downloaded, but the product items are **always**
  re-resolved from the products API. Product data (image, name, price) changes
  without bumping the marquee version, so caching resolved items on the version
  alone would freeze stale product images on `/home`.
* If re-resolution returns no items while the cache still has items, the cached
  items are kept, so a transient product-API failure does not empty the marquee.

Bump the cache key version in `@asol/featured-marquee-core` whenever the shape
or resolution rules of `resolvedConfig` change, so existing browsers discard
incompatible entries.

---

## Action Handling

The component **never navigates internally**. It only fires the `onAction` callback with the item's `action` string when a card is clicked. This keeps the component decoupled from any routing implementation.

```
User clicks card → onAction("go-to-nova-phone") → caller decides what to do
```
