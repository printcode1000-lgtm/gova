# Phone Field

## Purpose

`src/shared/ui/phone-field.tsx` is the single phone input of the application.
Every surface that takes a phone number — login, registration verification,
password recovery, profile contacts, onboarding, and the contact form — renders
it, so one component decides how a number is typed, corrected, and spelled.

## Value contract

The field's `value` is always the canonical **E.164** string, partial numbers
included: a half-typed Egyptian number is `+20102`, never `102`. Callers hand it
straight to the Zod schemas and to storage without knowing which country the
digits belonged to.

Internally it edits two things — the selected country and the national digits —
and recomposes them on every keystroke through
`src/shared/phone/phone-field-model.ts`.

Its strings come from `phoneFieldLabels(t, locale)` in
`src/shared/phone/phone-field-labels.ts`. The translator is passed in rather
than read from the i18n runtime inside the module, so `shared/phone` stays a
leaf nothing depends back on and the shared-module cycle audit stays green.

## Input rules

- Arabic-Indic (`٠١٢٣٤٥٦٧٨٩`) and Persian (`۰۱۲۳۴۵۶۷۸۹`) digits are folded to
  `0123456789`. A number typed on an Arabic keyboard is the same number.
- A national trunk zero is dropped: `010…` under Egypt is `+2010…`, never
  `+20010…`.
- Separators the user types (spaces, dashes, parentheses) never reach the value.
- A stored value that already carries a country code selects that country when
  the field is opened.

## Country picker

`src/shared/ui/phone-country-dialog.tsx` lists **every country the phone
metadata knows** — over two hundred — each with its flag, its name in the
reader's language, and its calling code. Names come from `Intl.DisplayNames`, so
no country table is bundled or translated by hand; a runtime without it falls
back to the ISO code.

Search matches a name, an ISO code, or a calling code, and ranks an exact code
match first: typing `de` means Germany to the person typing it.

## Default country

`DEFAULT_PHONE_COUNTRY` in `@asol/auth-core` is Egypt. It is what a number typed
without a country code is read against, which is why every account created
before this field existed keeps typing exactly what it always typed.

## Interaction rules

The country button and every country row are `<button>` elements driven by tap,
`active:`/`focus-visible:` styling, and `aria-label`/`aria-pressed`. No hover
behavior, no pointer cursor, no DOM `title`, and every label stays selectable,
per the [Touch Interaction Policy](./touch-interaction-policy.md).

## Diagnostic identity

The field declares no uid of its own — a generic helper under `src/shared/ui/`
never does. A caller passes its own `UiDescriptor` through `ui`, which lands on
the national-number input, so `login-phone`, `password-request-phone`, and the
onboarding fields keep the identities they had.

## Domain owner

Validation, normalization, comparison, and the country list all belong to
`packages/auth-core/src/domain/phone.ts`. See
[Auth Core Module](../05-platform-features/auth-core-module.md) for the
canonical value, the issue codes, and the E.164 migration.
