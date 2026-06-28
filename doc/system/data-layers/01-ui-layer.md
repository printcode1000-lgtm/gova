# UI Layer

## Role

Render data to the user — no business logic, no HTTP, no SQL.

## Location

`src/components/` — pages in `src/app/` import components only.

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| Read `loading` / `error` / `data` from hooks | Call `fetch` or `govaApi` |
| Pass events to hooks (`onSubmit`, `onChange`) | Import Repository or Server Service |
| Display lists/JSON from props or hooks | Drizzle, Database Client |

## Pattern

```
ProfilePage → useProfileContacts() → renders contacts / isLoading / save
```

The page does not know where data is stored (SQLite, Turso, IndexedDB).

## Rule

**Display source = Hook.** UI stays thin.
