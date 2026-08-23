# UI Layer

## Role

Render data to the user — no business logic, no HTTP, no SQL.

## Location

A domain's presentation lives **with that domain**:

- `src/features/<name>/presentation/` — the screens, cards and controllers that belong to one
  feature. This is where orders, product, profile, cart, categories, settings, super-admin, home,
  auth, splash and search UI live, beside the hooks and services they call.
- `src/components/ui/` — the design-system primitives shared by every feature.
- `src/components/layouts/`, `src/components/brand/` — the app shell and the brand mark, which
  belong to no single feature.

Pages in `src/app/` import components only.

Until the 2026-08 consolidation the split was horizontal — `src/components/<domain>/` for the UI,
`src/features/<domain>/` for its logic — and only for *some* features: favorites, storage, seller
discounts, notifications and specialty chat already kept their components inside the feature. One
domain being described in two trees, inconsistently, is what the move ended. The architecture
contract classifies both `src/components/**` and
`src/features/*/{presentation,components}/**` as the UI layer, so the rules below apply
identically in either place.

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| Read `loading` / `error` / `data` from hooks | Call `fetch` or `asolApi` |
| Pass events to hooks (`onSubmit`, `onChange`) | Import Repository or Server Service |
| Display lists/JSON from props or hooks | Drizzle, Database Client |

## Pattern

```
ProfilePage → useProfileContacts() → renders contacts / isLoading / save
```

The page does not know where data is stored (SQLite, Turso, IndexedDB).

## Rule

**Display source = Hook.** UI stays thin.
