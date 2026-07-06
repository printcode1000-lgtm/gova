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

**App preferences** (`src/lib/preferences/`) store the active locale in `localStorage` under `gova-app-preferences` as `prefs.locale` (`'ar' | 'en'`).

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

### Anti-flash mechanism (English locale)

Because the static HTML is built with Arabic as the default, switching to English during hydration would cause a one-frame Arabic text flash and a sidebar direction glitch. Three guards prevent this:

| Mechanism | Location |
|-----------|----------|
| `mounted` guard in `AppSidebar` — returns `null` on first render | `AppSidebar.tsx` |
| `data-hydrated="false"` on `<html>` in static markup | `layout.tsx` |
| CSS hides `body` while `data-locale="en"` and `data-hydrated="false"` | `globals.css` |
| `PreferencesProvider` sets `data-hydrated="true"` after loading locale | `PreferencesProvider.tsx` |

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

## Storage & migration

| Key | Field |
|-----|-------|
| `gova-app-preferences` | `prefs.locale`, `prefs.timezone` |

Legacy field `localePreview` is still read for backward compatibility.

---

## Related files

| File | Role |
|------|------|
| `src/lib/preferences/PreferencesProvider.tsx` | Wraps theme + app preferences |
| `src/lib/app-init/build-app-init-script.ts` | Blocking locale + theme restore |
| `src/components/settings/SettingsPageContent.tsx` | Language picker UI |
