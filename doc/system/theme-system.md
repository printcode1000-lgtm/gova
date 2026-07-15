# Theme System

Asol implements a **Material Design 3–style theme** with CSS custom properties, runtime preferences, and a blocking init script to prevent flash of wrong theme on load.

---

## Architecture

```
src/theme/
├── index.css              # Aggregates all theme CSS (imported from globals.css)
├── tokens.css             # Color tokens, surfaces, on-colors
├── tailwind-theme.css     # Tailwind @theme mapping
├── base.css               # Base element styles
├── preferences.css        # data-* attribute driven styles (density, contrast, motion)
├── color-balance.css      # 60 · 30 · 10 usage rule + asol-* surface classes
├── app-overrides.css      # App-specific overrides
└── runtime/
    ├── ThemeProvider.tsx       # React context for theme preferences
    ├── apply-document-theme.ts # Applies attrs/CSS vars to <html>
    ├── build-theme-init-script.ts  # Legacy theme-only script (prefer app-init)
    ├── storage.ts              # localStorage read/write
    ├── types.ts                # ThemeMode, ThemePreferences, storage keys
    └── ThemeInitScript.tsx     # Deprecated — use AppInitScript
```

**Unified init:** `src/lib/app-init/` generates `public/asol-app-init.js`, which restores **both theme and locale** before paint.

---

## Quick start

### Read theme state in components

```tsx
'use client';

import { useThemePreferences, useResolvedColorScheme } from '@/lib/preferences';
// or: import { useThemePreferences } from '@/theme/runtime';

export function ThemeToggle() {
  const { preferences, resolvedScheme, toggleColorScheme, updatePreferences } =
    useThemePreferences();

  return (
    <button type="button" onClick={toggleColorScheme}>
      Mode: {preferences.themeMode} (resolved: {resolvedScheme})
    </button>
  );
}
```

### Use theme CSS classes in JSX

The theme exposes utility classes used across the app:

| Class | Purpose |
|-------|---------|
| `asol-canvas` | Page background |
| `asol-control` | Inputs, buttons base sizing |
| `asol-card-tonal` | Tonal surface cards |
| `asol-accent-cta` | Primary call-to-action |
| `text-on-surface` | Default text color token |

Colors come from CSS variables defined in `tokens.css` (e.g. `--color-primary`, `--color-on-surface`).

---

## Color usage: 60 · 30 · 10 rule

Asol does **not** use the golden ratio (φ ≈ 1.618) for colors. Palette values come from **Material Design 3 / Google** tokens in `tokens.css`. **How those colors are applied** on screen follows the **60 · 30 · 10** balance defined in `color-balance.css`:

| Share | Role | Typical use |
|-------|------|-------------|
| **60%** | **Neutral** | Page canvas, body text, default cards |
| **30%** | **Tonal** | `*-container` surfaces, section bands, soft brand tint |
| **10%** | **Accent** | Primary CTAs, chips, badges, active nav, hero emphasis |

### Class mapping

**60% — Neutral**

| Class | Purpose |
|-------|---------|
| `asol-canvas` | Main page background |
| `asol-surface-neutral` | Neutral flat surface |
| `asol-card-neutral` | Default card |
| `asol-card-elevated` | Elevated neutral card |
| `asol-field-surface` | Form field background |
| `asol-empty-state` / `asol-empty-state-card` | Empty / coming-soon layouts |

**30% — Tonal** (primary / secondary / tertiary / error variants)

| Class | Purpose |
|-------|---------|
| `asol-section-tonal-*` | Full-width section bands |
| `asol-card-tonal-*` | Tonal cards |
| `asol-tonal-*` | Inline tonal blocks |
| `asol-ring-*` | Icon rings with tonal border |
| `asol-settings-section-*` | Settings panel sections |
| `asol-onboarding-*` | Onboarding shell / sidebar |
| `asol-merchant-band-*` | Merchant page bands |

**10% — Accent**

| Class | Purpose |
|-------|---------|
| `asol-accent-cta` / `asol-accent-cta-*` | Primary action buttons |
| `asol-accent-chip` / `asol-accent-chip-*` | Badges and labels |
| `asol-nav-pill-active` | Active bottom-nav item |
| `asol-section-heading-*` | Emphasized section titles |

When adding UI, prefer **neutral** for most of the layout, **tonal** for grouped content, and **accent** sparingly for actions and highlights — keeping roughly a 60 · 30 · 10 visual balance.

---

## Theme preferences

Stored in AsolDB (`IndexedDB`) under the `appSettings` store with the key `theme-preferences`:

| Field | Type | Description |
|-------|------|-------------|
| `themeMode` | `'light' \| 'dark'` | Color scheme preference (defaults to `'light'`) |
| `fontSize` | `number` (12–24) | Base font size in px |
| `density` | `'compact' \| 'comfortable' \| 'spacious'` | UI spacing scale |
| `highContrast` | `boolean` | Stronger borders/contrast |

---

## How theme is applied

1. **Before paint:** `asol-theme-init.js` initializes default attributes on `<html>` (such as light theme, comfortable density, 16px font-size) synchronously.
2. **After hydration:** `ThemeProvider` loads preferences asynchronously from AsolDB (`IndexedDB`), updates document attributes, and sets `data-theme-hydrated="true"` on `<html>`.
3. **CSS:** `preferences.css` reacts to `html[data-*]` attributes. The app body fades in smoothly (150ms transition) once both theme and app preferences have completed their async hydration.

---

## Dark mode with Tailwind

`src/app/globals.css`:

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

Use `dark:` utilities — they follow `data-theme`, not `class="dark"`.

---

## Root layout integration

```tsx
// src/app/layout.tsx
import { AppInitScript } from '@/lib/app-init';
import { PreferencesProvider } from '@/lib/preferences';

<html lang="ar" dir="rtl" data-theme="light" suppressHydrationWarning>
  <head>
    <AppInitScript />
  </head>
  <body>
    <PreferencesProvider>{children}</PreferencesProvider>
  </body>
</html>
```

`suppressHydrationWarning` on `<html>` is required because init script + client provider update `lang`, `dir`, and `data-theme` after SSR defaults.

---

## Bottom navigation safe space

All in-app routes are rendered through `AppShell`, which reserves enough space for the fixed bottom navigation. Page components must not add their own guessed bottom padding such as `pb-24` or hard-coded offsets such as `bottom-20`.

### How it works

- `BottomNavBar` measures its rendered height with `ResizeObserver`.
- The measured value is published on `<html>` as `--asol-bottom-nav-space`.
- The measurement includes the navigation content and `env(safe-area-inset-bottom)` padding.
- `AppShell` uses the shared `BOTTOM_NAV_CLEARANCE` value as its `padding-bottom`, so every route ends above the navigation automatically.
- The fallback is `5rem + env(safe-area-inset-bottom, 0px)`, preventing overlap before client hydration.
- An additional `1rem` gap keeps content visually separated from the navigation.

The shared expression is defined in:

```ts
// src/components/layouts/bottom-nav-layout.ts
export const BOTTOM_NAV_CLEARANCE =
  'calc(var(--asol-bottom-nav-space, calc(5rem + env(safe-area-inset-bottom, 0px))) + 1rem)';
```

### Fixed and sticky elements

Normal page content is protected by `AppShell`. Viewport-positioned elements are outside document flow, so every page-level `fixed` or bottom-aligned `sticky` element must use the same clearance:

```tsx
import { BOTTOM_NAV_CLEARANCE } from '@/components/layouts/bottom-nav-layout';

<div
  className="fixed inset-x-4"
  style={{ bottom: BOTTOM_NAV_CLEARANCE }}
>
  {/* floating action, toast, or status content */}
</div>
```

This rule applies to floating actions, save bars, toasts, network banners, and navigation hints. Decorative elements contained inside a component, such as an absolutely positioned carousel control, do not need the app-level clearance.

### Implementation rules

1. Do not add per-page bottom padding to compensate for `BottomNavBar`.
2. Do not duplicate the navigation height in Tailwind classes or CSS.
3. Import `BOTTOM_NAV_CLEARANCE` for any new viewport-level bottom element.
4. Keep the Safe Area padding on `BottomNavBar`; the measured height already includes it.
5. If the navigation height changes with content, locale, density, or device insets, `ResizeObserver` updates all consumers automatically.

---

## Settings UI

Users change theme options in **Settings** (`src/components/settings/SettingsPageContent.tsx`):

- Theme mode (light / dark / system)
- Font size slider
- Density chips
- High contrast toggle
- Reduced motion select

Labels are translated via i18n keys: `theme.light`, `density.compact`, `motion.system`, etc.

---

## Build script

```bash
npm run app:init
```

Regenerates `public/asol-app-init.js` from `src/lib/app-init/build-app-init-script.ts`.
Runs automatically before `dev` and `build`.

**Keep in sync:** init script logic must mirror `apply-document-theme.ts` and `apply-locale.ts`.

---

## Extending the theme

### New CSS token

1. Add variable to `src/theme/tokens.css`
2. Map in `tailwind-theme.css` if needed for Tailwind utilities
3. Use via `var(--your-token)` or Tailwind class

### New preference field

1. Add to `ThemePreferences` in `src/theme/runtime/types.ts`
2. Handle in `normalizeThemePreferences()` (`storage.ts`)
3. Apply in `apply-document-theme.ts`
4. Add CSS rules in `preferences.css` if needed
5. Update `build-app-init-script.ts` for flash-free init
6. Add UI in settings + i18n keys

### Tailwind class scanning

`globals.css` uses broad `@source` paths:

```css
@source "../components/**/*.{ts,tsx}";
@source "../lib/**/*.{ts,tsx}";
```

New component folders are picked up automatically.

---

## Separation: theme vs app preferences

| Storage key | Managed by | Contents |
|-------------|------------|----------|
| `asol-theme-preferences` | `ThemeProvider` | Visual / accessibility |
| `asol-app-preferences` | `AppPreferencesScope` | Locale, timezone |

Both are restored by `asol-app-init.js` before paint.

---

## Testing

Theme runtime tests: `src/theme/runtime/__tests__/theme-runtime.test.ts`

```bash
npx tsx --test src/theme/runtime/__tests__/theme-runtime.test.ts
```

---

## Related documentation

- [i18n-system.md](./i18n-system.md) — locale, RTL, translation keys
