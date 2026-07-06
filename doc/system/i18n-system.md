# Internationalization (i18n) System

Gova uses a **lightweight custom i18n layer** — no `next-intl` dependency. All UI strings live in JSON dictionaries and are accessed through a small API in `src/lib/i18n/`.

---

## Architecture

```
src/
├── locales/
│   ├── ar.json          # Arabic dictionary (source of truth for keys)
│   └── en.json          # English dictionary (must match ar.json keys)
└── lib/i18n/
    ├── index.ts         # Public API
    ├── types.ts         # Locale, TranslationParams
    ├── constants.ts     # DEFAULT_LOCALE, SUPPORTED_LOCALES, isRtlLocale()
    ├── dictionaries.ts  # Loads JSON files, exports TranslationKey type
    ├── translate.ts     # translate(), interpolate(), dev missing-key warnings
    ├── apply-locale.ts  # Sets <html lang dir data-locale>
    └── use-translation.ts  # React hook
```

**App preferences** (`src/lib/preferences/`) store the active locale in GovaDB (`IndexedDB`) under the `appSettings` store with the key `app-preferences` as `locale` (`'ar' | 'en'`).

---

## Quick start

### In React components

```tsx
'use client';

import { useTranslation } from '@/lib/i18n';

export function MyComponent() {
  const { t, locale, isRTL, changeLanguage } = useTranslation();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <h1>{t('nav.home')}</h1>
      <p>{t('auth.otp.resendCountdown', { seconds: 30 })}</p>
      <button type="button" onClick={() => changeLanguage('en')}>
        English
      </button>
    </div>
  );
}
```

### Outside React (utilities, metadata, Zod schemas)

```ts
import { translate, DEFAULT_LOCALE } from '@/lib/i18n';

const label = translate(DEFAULT_LOCALE, 'onboarding.meta.title');

// Dynamic validation messages
export function createLoginSchema(t: (key: string) => string) {
  return z.object({
    phone: z.string().min(1, t('auth.validation.phoneRequired')),
  });
}
```

---

## Translation keys

- **Format:** flat dot notation — `namespace.section.label`
- **Examples:** `nav.home`, `auth.login.title`, `onboarding.steps.shipping.title`
- **Rule:** every key in `ar.json` **must** exist in `en.json` (and vice versa)

TypeScript autocomplete is available via `TranslationKey` (derived from `ar.json`).

---

## Interpolation

Use `{{param}}` placeholders in JSON values:

```json
{
  "onboarding.progress.sectionsCompleted": "{{completed}} of {{total}} sections completed"
}
```

```tsx
t('onboarding.progress.sectionsCompleted', { completed: 3, total: 12 })
```

---

## RTL / LTR

| Locale | Direction |
|--------|-----------|
| `ar`   | `rtl`     |
| `en`   | `ltr`     |

`applyDocumentLocale()` updates `<html lang dir data-locale>`. Called when preferences change and **before first paint** via `public/gova-app-init.js`.

Use `isRTL` from `useTranslation()` for component-level layout (icons, chevrons, etc.).

### Anti-flash mechanism (GovaDB async hydration)

Because preferences are loaded asynchronously from GovaDB, rendering the page immediately would cause text/theme flashes. The following mechanism prevents this:

| Mechanism | Location |
|-----------|----------|
| `mounted` guard in `AppSidebar` — returns `null` on first render | `AppSidebar.tsx` |
| `data-theme-hydrated="false"` and `data-app-hydrated="false"` on `<html>` | `layout.tsx` |
| CSS hides `body` (`opacity: 0`) by default | `globals.css` |
| `ThemeProvider` and `PreferencesProvider` set their respective hydration flags to `"true"` on `<html>` | `ThemeProvider.tsx` & `PreferencesProvider.tsx` |
| CSS reveals `body` with a smooth 150ms transition once both flags are `"true"` | `globals.css` |

See [`doc/problems/english-locale-hydration-flash.md`](../problems/english-locale-hydration-flash.md) for the full root-cause analysis.

---

## Adding a new string

1. Add the key to **both** `src/locales/ar.json` and `src/locales/en.json`
2. Use `t('your.new.key')` in the component
3. In development, missing keys log `[i18n] Missing translation key: "..."` once per key

---

## Adding a new language (future)

1. Add locale code to `Locale` in `src/lib/i18n/types.ts`
2. Add to `SUPPORTED_LOCALES` in `constants.ts`
3. Create `src/locales/xx.json` with all keys
4. Register in `dictionaries.ts`
5. Update `applyDocumentLocale()` / `isRtlLocale()` if the language is RTL

---

## Auth validation pattern

Schemas are created with a `t` function so error messages are localized:

```ts
// src/lib/validation/auth.ts
export function createRegistrationSchema(t: (key: string) => string) { ... }

// In component
const { t } = useTranslation();
const schema = useMemo(() => createRegistrationSchema(t), [t]);
```

---

## Splash initialization

`src/lib/initialization/initialization.ts` emits `statusKey` values (e.g. `init.starting`). `SplashInitializer` translates them with `t(statusKey)`.

---

## Storage

Stored in GovaDB (`IndexedDB`) under the `appSettings` store with the key `app-preferences`:

| Key | Field |
|-----|-------|
| `app-preferences` | `locale` |

---

## Related files

| File | Role |
|------|------|
| `src/lib/preferences/PreferencesProvider.tsx` | Wraps theme + app preferences |
| `src/lib/app-init/build-app-init-script.ts` | Blocking locale + theme restore |
| `src/components/settings/SettingsPageContent.tsx` | Language picker UI |
