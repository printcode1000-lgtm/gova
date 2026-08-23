# Hooks Layer

## Role

Connect UI to data state: reads (`useQuery`), writes (`useMutation`), forms (React Hook Form + Zod).

## Location

`src/features/[feature]/hooks/`

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| `useQuery` / `useMutation` | Repository, Operations, Database |
| Call **Client Service** (`authService`, `profileService`) | Direct `fetch` |
| Stable `queryKey` + invalidation after mutations | Server-only modules |

## Flow

```
Hook → Client Service → AsolApiClient → API
Hook ← JSON ← same path back
```

After a successful mutation: update cache or `invalidateQueries`.

## Examples

- `use-login.ts` — mutation + session via SessionService
- `use-profile-contacts.ts` — query + save mutation

## Rule

Hooks **coordinate client state** — they are not the permanent data store.
