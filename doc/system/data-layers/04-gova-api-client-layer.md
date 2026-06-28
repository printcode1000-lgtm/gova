# GovaApiClient Layer

## Role

The **only** HTTP gateway from the client to the GOVA backend — all platforms (Web, Static, Capacitor).

## Location

`src/core/api/`

| File | Purpose |
|------|---------|
| `gova-api-client.ts` | `govaApi` singleton |
| `gova-http-transport.ts` | **Only** module allowed to call `fetch()` |
| `gova-api-routes.ts` | Canonical `/api/*` paths |
| `gova-api-config.ts` | Resolves `GOVA_API_BASE_URL` |

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| JSON in/out | Database access |
| `getPublicJson` for `public/` assets | Turso secrets |

## Base URL resolution

1. `NEXT_PUBLIC_GOVA_API_BASE_URL` (Static/Capacitor)
2. `NEXT_PUBLIC_GOVA_API_URL` (legacy alias)
3. `GOVA_API_BASE_URL` (CI build-time)
4. Same origin + `GOVA_BASE_PATH` (local dev / co-hosted)

The client never references Vercel, AWS, or any host by name.

## Usage

```typescript
import { govaApi, GOVA_API_ROUTES } from '@/core/api';

await govaApi.post(GOVA_API_ROUTES.auth.login, { phone, password });
```

## Rule

All network data passes through here — no exceptions in features.
