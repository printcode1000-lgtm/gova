# Build failure — direct `fetch()` in CategoriesGrid

**Date:** 2026-06-27  
**Environment:** Vercel Production / `npm run build`  
**Status:** Resolved

---

## Symptoms

```
Architecture Violation

Layer: asol-api-client
File: src/components/home/CategoriesGrid.tsx
Violation: fetch() used outside asol-http-transport.ts.
Allowed: Use asolApi from @/core/api.

Build Failed.
```

Build exits with code 1 during `npm run architecture:check` (runs before `next build`).

---

## Cause

`CategoriesGrid.tsx` loaded category JSON with a raw browser `fetch()`:

```typescript
const response = await fetch('/catagory/categories.json');
const data: Category[] = await response.json();
```

ASOL Architecture Contract allows `fetch()` **only** in `src/core/api/asol-http-transport.ts`. All client data access — including static public JSON — must go through `AsolApiClient` (`asolApi.getPublicJson`).

`npm run build` runs `architecture:check` first, so the violation blocks deploy on Vercel and locally.

---

## Solution

Replace direct `fetch` with `asolApi.getPublicJson()` — same pattern as `TopMarquee.tsx`:

```typescript
import { asolApi } from '@/core/api';

const data = await asolApi.getPublicJson<Category[]>('/catagory/categories.json');
```

> Current architecture: this historical workaround has been superseded. UI code must import typed projections from `@/features/categories`; only the category module may import the canonical JSON files.

**File changed:** `src/components/home/CategoriesGrid.tsx`

---

## Verification

```bash
npm run architecture:check   # 100%
npm run build                # succeeds
```

---

## Prevention

- Never use `fetch()`, `axios`, or `XMLHttpRequest` in components, hooks, or features.
- Static assets under `public/` → `asolApi.getPublicJson('/path/to/file.json')`
- Business data → `asolApi.get/post/put` + `ASOL_API_ROUTES`

See [data-layers/04-asol-api-client-layer.md](../system/data-layers/04-asol-api-client-layer.md) and [data-layers/19-architecture-contract.md](../system/data-layers/19-architecture-contract.md).

---

## Related files

- `src/components/home/CategoriesGrid.tsx`
- `src/components/splash/TopMarquee.tsx` (correct reference)
- `src/core/api/asol-api-client.ts` — `getPublicJson()`
- `scripts/architecture-check.ts`
