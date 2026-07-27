# Reusable TrendingRibbon Component Developer Guide

The `TrendingRibbon` is a reusable, self-scrolling text ticker component designed for Next.js App Router applications. It displays a marquee of trending product or topic names in a highlighted error-tonal band, with no dependency on translations or business logic.

---

## Component Location
* Code: [TrendingRibbon.tsx](file:///c:/Users/hesham/Desktop/asol/src/components/ui/TrendingRibbon.tsx)
* Configuration Example (Home Page): [home-trending-ribbon.json](file:///c:/Users/hesham/Desktop/asol/src/components/home/home-trending-ribbon.json)

---

## Features
1. **Seamless Scrolling**: Auto-scrolls text items infinitely via CSS marquee keyframes.
2. **Action Callbacks**: Each item carries an `action` string. When an item is clicked, the component fires `config.onAction(action)` — keeping routing logic entirely outside the component.
3. **Translation Independence**: Renders labels and section header text exactly as supplied by the configuration JSON without calling any translation hooks.
4. **Accessible**: Each item is rendered as a focusable `<button>` element.
5. **No Images**: Text-only display optimized for quick-loading, high-visibility placement.

---

## Configuration Model

The component accepts **exactly one prop**: `config`.

### `TrendingRibbonConfig` Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `label` | `string` | The prefix badge text shown before the scrolling items (e.g., `"Trending:"`). |
| `items` | `TrendingRibbonItem[]` | List of trending items to display in the ribbon. |
| `onAction` | `(action: string) => void` | (Optional) Callback fired when a trending item is clicked. |

### `TrendingRibbonItem` Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `label` | `string` | The display text shown in the scrolling ribbon. |
| `action` | `string` | Action identifier passed back to `onAction` when clicked. |

---

## Usage Example

### 1. Create a Configuration JSON File
Place a JSON file in the folder of your Screen component:

```json
{
  "label": "Trending:",
  "items": [
    { "label": "Nova S24 Pro Phone",  "action": "go-to-nova-phone" },
    { "label": "Timepiece Watch",     "action": "go-to-timepiece-watch" },
    { "label": "Pro Runner Shoes",    "action": "go-to-runner-shoes" },
    { "label": "Scanner Device v4",   "action": "go-to-scanner-v4" }
  ]
}
```

### 2. Implement the Component on a Page

```tsx
'use client';

import { useMemo } from 'react';
import { TrendingRibbon, type TrendingRibbonConfig } from '@/components/ui/TrendingRibbon';
import ribbonData from './my-trending-ribbon.json';

export default function MyScreen() {
  const ribbonConfig = useMemo<TrendingRibbonConfig>(
    () => ({
      label: ribbonData.label,
      items: ribbonData.items,
      onAction: (action) => {
        // Handle navigation or any logic here
        console.log('Trending item clicked:', action);
        // e.g., router.push(`/search?q=${action}`)
      },
    }),
    []
  );

  return (
    <div className="w-full">
      <TrendingRibbon config={ribbonConfig} />
    </div>
  );
}
```

---

## Action Handling

The component **never navigates internally**. It only fires the `onAction` callback with the item's `action` string when clicked. This keeps the component fully decoupled from routing.

```
User clicks item → onAction("go-to-nova-phone") → caller decides what to do
```
