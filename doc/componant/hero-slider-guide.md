# Reusable HeroSlider Component Developer Guide

The `HeroSlider` is a highly customizable, pure, and accessible carousel component designed for Next.js App Router applications. It is fully responsive, optimized for fast image loading, and has zero direct dependencies on feature-specific business or internationalization logic.

---

## Component Location
* Code: [HeroSlider.tsx](file:///c:/Users/hesham/Desktop/gova/src/components/ui/HeroSlider.tsx)
* Configuration Example (Home Page): [home-hero-slider.json](file:///c:/Users/hesham/Desktop/gova/src/components/home/home-hero-slider.json)

---

## Features

1. **Custom Transitions**: Supports five premium styles: `Fade`, `SlideLeft`, `SlideRight`, `Zoom`, and `Parallax` (a dynamic reverse offset for background images).
2. **Flexible Autoplay**: Each slide specifies its own duration; the autoplay mechanism dynamically adjusts the timer as slides change.
3. **Advanced Image Optimization**:
   - Uses Next.js `Image`.
   - Priority loads the first slide, active slide, and next slide (preloaded ahead of time).
   - Lazy-loads other slides to conserve bandwidth.
4. **Loading States**: Includes a pulsing `Skeleton` backdrop overlay that covers the slider container while the active slide's image is fetching.
5. **Mobile Touch Support**: Supports horizontal swiping gestures (Swipe Left / Swipe Right) tailored for mobile users.
6. **Built-in Accessibility (a11y)**:
   - Uses correct semantic roles (`region`, `button`, `tablist`, `tab`).
   - Supports keyboard arrow keys (`ArrowLeft` / `ArrowRight`) with built-in Right-To-Left (RTL) layout direction awareness.
   - Screen reader announcements (`aria-live="polite"`).

---

## Configuration Model

The component accepts **exactly one prop**: `config`.

### `HeroSliderConfig` Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `transition` | `'Fade' \| 'SlideLeft' \| 'SlideRight' \| 'Zoom' \| 'Parallax'` | The transition type applied to all slides. |
| `transitionDuration` | `number` | Duration of the slide transition in milliseconds. |
| `autoPlay` | `boolean` | Activates automatic slide rotations. |
| `loop` | `boolean` | Enables cycling back to the first slide upon reaching the end. |
| `slides` | `HeroSliderSlide[]` | Array of slide configurations. |
| `onAction` | `(action: string) => void` | (Optional) Triggered when a slide is clicked or activated. |

### `HeroSliderSlide` Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `priority` | `number` | Controls visual rendering order (sorted ascending). |
| `image` | `string` | Image source URL or local path. |
| `title` | `string` | Header text shown on the slide. |
| `subtitle` | `string` | Tiny pill-badge text shown above the title. |
| `duration` | `number` | Autoplay display length for this slide in milliseconds. |
| `action` | `string` | Action string passed back to the `onAction` handler. |

---

## Usage Example

### 1. Create a Configuration JSON File
Place a JSON file in the folder of your screen component (e.g., `home-hero-slider.json` alongside `HomeScreen.tsx`):

```json
{
  "transition": "SlideLeft",
  "transitionDuration": 500,
  "autoPlay": true,
  "loop": true,
  "slides": [
    {
      "priority": 100,
      "image": "https://example.com/slide-1.jpg",
      "title": "Welcome to Gova Market",
      "subtitle": "Featured Promo",
      "duration": 4000,
      "action": "go-to-featured-market"
    },
    {
      "priority": 200,
      "image": "https://example.com/slide-2.jpg",
      "title": "Industrial Excellence in Suez",
      "subtitle": "Just Arrived",
      "duration": 5000,
      "action": "go-to-industrial-suez"
    }
  ]
}
```

### 2. Implement the Component on a Page
Import the component and JSON config inside your Screen component:

```tsx
'use client';

import { useMemo } from 'react';
import { HeroSlider, type HeroSliderConfig } from '@/components/ui/HeroSlider';
import sliderData from './home-hero-slider.json';

export default function MyScreen() {
  const sliderConfig = useMemo<HeroSliderConfig>(
    () => ({
      transition: sliderData.transition as HeroSliderConfig['transition'],
      transitionDuration: sliderData.transitionDuration,
      autoPlay: sliderData.autoPlay,
      loop: sliderData.loop,
      onAction: (action) => {
        console.log('User clicked slider action:', action);
        // Ex: router.push(`/search?action=${action}`)
      },
      slides: sliderData.slides,
    }),
    []
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <HeroSlider config={sliderConfig} />
    </div>
  );
}
```
