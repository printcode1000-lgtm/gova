# AsolApiClient Layer

## Role

The **only** HTTP gateway from the client to the ASOL backend — all platforms (Web, Static, Capacitor).

## Location

`src/core/api/`

| File | Purpose |
|------|---------|
| `asol-api-client.ts` | `asolApi` singleton |
| `asol-http-transport.ts` | **Only** module allowed to call `fetch()` |
| `asol-api-routes.ts` | Canonical `/api/*` paths |
| `asol-api-config.ts` | Resolves `ASOL_API_BASE_URL` |

## Data responsibilities

| Allowed | Forbidden |
|---------|-----------|
| JSON in/out | Database access |
| `getPublicJson` for `public/` assets | Turso secrets |

## Base URL resolution

1. `NEXT_PUBLIC_ASOL_API_BASE_URL` (Static/Capacitor)
2. `NEXT_PUBLIC_ASOL_API_URL` (legacy alias)
3. `ASOL_API_BASE_URL` (CI build-time)
4. Same origin + `ASOL_BASE_PATH` (local dev / co-hosted)

The client never references Vercel, AWS, or any host by name.

## Usage

```typescript
import { asolApi, ASOL_API_ROUTES } from '@/core/api';

await asolApi.post(ASOL_API_ROUTES.auth.login, { phone, password });
```

## Rule

All network data passes through here — no exceptions in features.
