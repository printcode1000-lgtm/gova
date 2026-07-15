# English Locale: Arabic Text Flash + Sidebar Direction Glitch

## Symptoms

Reproducible **only** when the stored locale is `en`. On every hard refresh:

1. **Sidebar glitch** — the sidebar panel briefly appears on the **right** side of the screen, then rapidly slides to the left and disappears.
2. **Text flash** — all translated strings render in **Arabic first**, then instantly switch to English.

The same behaviour does not occur in Arabic mode because Arabic is the default locale baked into the static HTML.

---

## Root Cause

### Why it only affects English

The static HTML exported by Next.js (`npm run build:static`) always starts with:

```html
<html lang="ar" dir="rtl" data-theme="light">
```

The blocking script `asol-app-init.js` runs **before React** and correctly updates `<html>` attributes to `dir="ltr" lang="en"`, but it cannot change the **React component state** — specifically the `locale` state inside `PreferencesProvider`, which starts at the JavaScript default value `'ar'`.

This means during React's hydration phase:

- The `<html>` element has `dir="ltr"` (set by the blocking script ✅)
- But every component that calls `useTranslation()` reads `locale = 'ar'` (React default ❌)

### Sidebar glitch mechanism

`AppSidebar` uses Tailwind responsive direction classes to hide itself when closed:

```tsx
isOpen ? "translate-x-0" : "rtl:translate-x-full ltr:-translate-x-full"
```

And sets its own `dir` attribute from `isRTL`:

```tsx
dir={isRTL ? "rtl" : "ltr"}
```

During the first render (before `PreferencesProvider` mounts):

- `isRTL` is `true` (from default `locale = 'ar'`), so the sidebar gets `dir="rtl"`
- But `<html>` has `dir="ltr"`, so Tailwind's `rtl:` prefix is **inactive**
- The `ltr:-translate-x-full` class is active, but the sidebar itself has `dir="rtl"`, so `inset-inline-start` resolves to the **right** side
- Result: sidebar briefly appears at the **right** of the screen

After `PreferencesProvider`'s `useEffect` fires and sets `locale = 'en'`:

- `isRTL` becomes `false`, sidebar re-renders with `dir="ltr"` and correct `ltr:-translate-x-full`
- The `transition-transform duration-300 ease-out` class animates the shift → visible slide

### Text flash mechanism

The static HTML contains Arabic text baked in at build time. React hydration replaces it with the correct English strings, but only **after** `useEffect` fires (which is after the first paint). This causes a visible one-frame Arabic flash.

---

## Fix

Three coordinated changes:

### 1. `src/components/layouts/AppSidebar.tsx`

Added `mounted` state. The component returns `null` on the first render, preventing the sidebar from appearing in the DOM before `PreferencesProvider` has applied the correct locale.

```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// ...
if (!mounted) return null;
```

**Why this is safe:** the sidebar is never shown on first paint regardless; `isOpen` starts as `false`. The `null` return just avoids a DOM node whose direction is wrong.

### 2. `src/lib/preferences/PreferencesProvider.tsx`

After reading and applying stored preferences, set `data-hydrated="true"` on `<html>`:

```tsx
React.useEffect(() => {
  commitPreferences(readStoredAppPreferences());
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-hydrated', 'true');
  }
}, [commitPreferences]);
```

### 3. `src/app/layout.tsx`

Added `data-hydrated="false"` as the static HTML default:

```tsx
<html lang="ar" dir="rtl" data-theme="light" data-hydrated="false" suppressHydrationWarning>
```

### 4. `src/app/globals.css`

CSS rule that hides the body **only** when locale is English and hydration is not yet complete:

```css
html[data-locale="en"][data-hydrated="false"] body {
  opacity: 0;
  pointer-events: none;
}

html[data-hydrated="true"] body {
  opacity: 1;
  transition: opacity 0.1s ease;
}
```

---

## Event sequence after fix (English mode, hard refresh)

```
1. Browser parses HTML → <html data-hydrated="false" lang="ar" dir="rtl">
2. asol-app-init.js runs (blocking, before paint):
     → <html data-locale="en" dir="ltr">
     → CSS rule activates → body { opacity: 0 }   ← user sees nothing yet
3. React hydrates, PreferencesProvider mounts
4. useEffect fires:
     → readStoredAppPreferences() → locale = "en"
     → applyDocumentLocale("en") → <html lang="en" dir="ltr" data-locale="en">
     → data-hydrated = "true"  ← CSS rule deactivates
     → body fades in (opacity 0→1, 100ms)
     → AppSidebar mounts with mounted=true and correct isRTL=false
```

The user never sees Arabic text or a mis-directed sidebar.

---

## Affected files

| File | Change |
|------|--------|
| `src/components/layouts/AppSidebar.tsx` | `mounted` guard — returns `null` before hydration |
| `src/lib/preferences/PreferencesProvider.tsx` | Sets `data-hydrated="true"` after loading preferences |
| `src/app/layout.tsx` | Adds `data-hydrated="false"` to static `<html>` |
| `src/app/globals.css` | Anti-flash CSS rule using `data-locale` + `data-hydrated` |

---

## Why Arabic mode is unaffected

When locale is `ar`, the `asol-app-init.js` script sets `data-locale="ar"`. The CSS selector `html[data-locale="en"][data-hydrated="false"]` never matches, so the body is always visible and no change in behaviour occurs.
