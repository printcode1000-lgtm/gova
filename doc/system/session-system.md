# Session System

Client authentication state in GOVA is simple:

- **Logged in** → `AuthSession` in Gova IndexedDB (`auth` store, key `current`)
- **Guest** → no record in IndexedDB (`null`)
- **React Query** caches the result for UI only — IndexedDB is the source of truth

See [data-architecture-guide.md](./data-architecture-guide.md) for the full layer architecture.

---

## Model

```
Login / Register  →  token + uid
        ↓
sessionService.startSession()   →  write auth/current
        ↓
sessionService.restoreSession() →  read auth/current (or null)
        ↓
useSession()                    →  React Query cache
        ↓
UI (AppSidebar, …)
```

| Layer | Responsibility |
|---|---|
| `SessionApiService` | Only code that reads/writes session in IndexedDB |
| `AuthApiService` | HTTP login/register only (no session persistence) |
| `useLogin` / `useRegister` | API + `startSession()` + `setSessionCache()` |
| `useLogout` | `clearSession()` + `setSessionCache(null)` — **no server call** |
| `useSession()` | `session`, `isAuthenticated`, `isGuest` |

There is **no server session**. Server `POST /api/auth/logout` exists but is a no-op; logout is entirely client-side.

---

## `AuthSession`

**File:** `src/features/auth/entities/session.entity.ts`

| Field | Type | Description |
|---|---|---|
| `token` | `string` | Token from login API |
| `uid` | `string` | User id |
| `phone` | `string` | Phone number |
| `displayName` | `string` | Shown in sidebar (defaults to phone) |
| `loginAt` | `string` | ISO timestamp |

```typescript
type SessionState = AuthSession | null;  // null = guest

function isAuthenticated(session: SessionState): boolean {
  return session !== null && !!session.token;
}
```

Guest users have **no row** in IndexedDB. Do not write a guest object to IDB.

---

## IndexedDB

| Store | Key | Value |
|---|---|---|
| `auth` | `current` | `AuthSession` when logged in |
| `auth` | `auth` | Legacy `{ authToken }` — migrated once, then deleted |

Helpers (used **only** inside `SessionApiService`):

- `govaDbGetCurrentSession()` / `govaDbSetCurrentSession()` / `govaDbDeleteCurrentSession()`
- `govaDbDeleteAuthLegacy()` — removes legacy `auth` key

**Separate:** anonymous “continue as guest” uses `guestSessions` store via `useGuestSession()` — unrelated to auth sessions.

---

## Session Service API

**File:** `src/features/auth/services/session-api-service.ts`  
**Export:** `sessionService` from `session-service.ts`

| Method | Returns | Effect |
|---|---|---|
| `restoreSession()` | `AuthSession \| null` | Read IDB; migrate legacy token if needed |
| `getCurrentSession()` | `AuthSession \| null` | Same as restore |
| `startSession(input)` | `AuthSession` | Write `auth/current` |
| `updateSession(patch)` | `AuthSession \| null` | Update displayName/phone when logged in |
| `clearSession()` | `null` | Delete `auth/current` + legacy `auth` key |

---

## Hooks

### `useSession()`

```tsx
const { session, isAuthenticated, isGuest, isLoading } = useSession();
```

- `session` — `AuthSession | null`
- `isAuthenticated` — `!!session?.token`
- `isLoading` — first IDB read not finished yet

### `useSessionQuery()`

Low-level React Query wrapper. Mounted in `SessionRestore` (inside `AppShell`) so session is restored on every app load.

### Cache sync after mutations

**File:** `src/features/auth/hooks/session-cache.ts`

```typescript
setSessionCache(queryClient, session);  // AuthSession after login
setSessionCache(queryClient, null);     // after logout
```

Always call this in `onSuccess` of login/register/logout. Do not rely on `invalidateQueries` alone.

### React Query settings

| Setting | Value |
|---|---|
| `staleTime` | `Infinity` — session changes only via `setSessionCache` or first mount |
| Persisted to RQ cache | **No** — excluded in `AppQueryProvider` |
| Legacy RQ rows on restore | Stripped in `AppQueryProvider` (old builds could freeze UI) |

---

## User flows

### Login

```
useLogin()
  → authService.login()
  → sessionService.startSession()
  → endGuestSession()
  → setSessionCache(session)
```

### Register

```
useRegister()
  → authService.register()
  → authService.login()
  → sessionService.startSession()
  → setSessionCache(session)
```

### Logout

```
useLogout()
  → sessionService.clearSession()   // IDB only
  → setSessionCache(null)
```

No HTTP request. This fixes logout when the API is unreachable (static export, offline).

### App reload

```
AppShell → SessionRestore → useSessionQuery()
  → sessionService.restoreSession()
  → null (guest) or AuthSession
```

---

## Sidebar UI

**File:** `src/components/layouts/AppSidebar.tsx`

| State | Items |
|---|---|
| Guest | Login, Settings |
| Authenticated | User info, Logout, Profile, Settings |

Profile link is **not** in the bottom nav — sidebar only, when authenticated.

---

## Rules

| Do | Don't |
|---|---|
| Use `useSession()` in UI | Read IndexedDB from hooks/components |
| Use `setSessionCache()` after session mutations | Use `invalidateQueries` without `setSessionCache` |
| Use `useLogout()` for logout | Call `authService.logout()` before clearing (unnecessary HTTP) |
| Use `sessionService` from hooks | Store tokens in `localStorage` or Zustand as SSOT |

---

## File map

```
src/features/auth/
├── entities/session.entity.ts      # AuthSession, isAuthenticated, normalizeStoredSession
├── services/
│   ├── session-api-service.ts      # IDB owner
│   └── session-service.ts
├── hooks/
│   ├── session-cache.ts            # setSessionCache
│   ├── use-session-query.ts        # useSession, useSessionQuery
│   ├── use-login.ts
│   ├── use-register.ts
│   └── use-logout.ts
└── components/SessionRestore.tsx

src/core/providers/query-provider.tsx   # Excludes current_session from RQ persist
src/components/layouts/AppSidebar.tsx
```

---

## Platform notes

Session logic is identical on dev, Vercel, static export, GitHub Pages, and Capacitor — browser/WebView IndexedDB only. No Capacitor plugins required.

---

## Related

- [data-architecture-guide.md](./data-architecture-guide.md)
- [capacitor.md](./capacitor.md)
