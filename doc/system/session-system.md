# Session System

GOVA manages **client-side authentication state** through a formal **Current Session** entity. **Gova IndexedDB (`GovaDB`) is the single source of truth (SSOT)** for session data on the client. React Query, React state, and Zustand may cache or reflect session state — they must never be treated as the authority.

For the full data-flow architecture (GovaApiClient, Business APIs, Repository), see [data-architecture-guide.md](./data-architecture-guide.md).

---

## Role in the project

```
Login / Register API  →  token + uid
        ↓
SessionApiService.startSession()
        ↓
Gova IndexedDB  (auth store, key: current)
        ↓
SessionService.getCurrentSession() / restoreSession()
        ↓
useSessionQuery / useSession  (React Query cache)
        ↓
UI (AppSidebar, …)
```

| Concern | Owner |
|---|---|
| Session persistence (read/write) | `SessionApiService` only |
| HTTP login/register/logout | `AuthApiService` |
| Business logic (validate credentials) | `AuthService` (server) |
| UI session display | Hooks → Components |
| Raw IndexedDB primitives | `src/lib/gova-db/index.ts` (low-level; not for features/hooks/UI) |

**There is no server-side session store today.** The server issues a token on login; the client stores the full `CurrentSession` in IndexedDB. Server `logout` is a no-op; clearing happens client-side via `clearSession()`.

---

## Session entity

**Location:** `src/features/auth/entities/session.entity.ts`

### `CurrentSession`

| Field | Type | Guest | Authenticated |
|---|---|---|---|
| `status` | `'guest' \| 'authenticated'` | `'guest'` | `'authenticated'` |
| `sessionId` | `string` | Generated | `crypto.randomUUID()` |
| `uid` | `string?` | — | User id from API |
| `token` | `string?` | — | Token from login API |
| `phone` | `string?` | — | User phone |
| `displayName` | `string?` | — | Display label (defaults to phone) |
| `loginAt` | `string?` (ISO) | — | Session start time |

A session is **valid authenticated** only when:

```typescript
status === 'authenticated' && !!token && !!uid
```

(`isAuthenticatedSession()` in `session.entity.ts`)

### Guest state

When no valid session exists in IndexedDB, `getCurrentSession()` returns an in-memory **guest** session via `createGuestSession()`. Guest sessions are **not** written to IndexedDB unless you explicitly add that later.

---

## GovaDB storage

**Database:** `GovaDB` (IndexedDB, version 4)  
**Store:** `auth` (`GOVA_DB_STORES.AUTH`)  
**Key:** `current`

Low-level helpers (used **only** by `SessionApiService`):

| Helper | Purpose |
|---|---|
| `govaDbGetCurrentSession<T>()` | Read `current` record |
| `govaDbSetCurrentSession<T>(session)` | Write `current` record |
| `govaDbDeleteCurrentSession()` | Remove `current` record |

### Legacy migration

Older builds stored only `{ authToken }` under key `auth`. On first `restoreSession()` / `getCurrentSession()`, `SessionApiService` migrates that token into a `CurrentSession`, writes it under `current`, and clears the legacy key.

### Separate: guest sessions

Anonymous “continue as guest” uses a **different** store:

| Store | Key | Purpose |
|---|---|---|
| `guestSessions` | `current` | Guest browsing id (`useGuestSession`) |

Guest and authenticated sessions are independent. Login/register call `endGuestSession()` after `startSession()`.

---

## Session Service

**Interface:** `src/features/auth/services/session-service.interface.ts`  
**Implementation:** `src/features/auth/services/session-api-service.ts`  
**Client entry:** `src/features/auth/services/session-service.ts` → `sessionService`

### API

| Method | When to use | Effect |
|---|---|---|
| `restoreSession()` | App startup | Same as `getCurrentSession()` — reads IDB, migrates legacy, returns guest if invalid |
| `getCurrentSession()` | Read current state | IDB → validated `CurrentSession` or guest |
| `startSession(input)` | After successful login/register | Writes full authenticated session to IDB |
| `updateSession(patch)` | Profile display tweaks | Merges `displayName` / `phone` when authenticated |
| `clearSession()` | Logout | Deletes IDB record, clears legacy auth, returns guest |

### `StartSessionInput`

```typescript
{
  token: string;
  uid: string;
  phone: string;
  displayName?: string;  // defaults to phone
}
```

### Rules (Architecture Contract)

- **Hooks, UI, and features must not** call `govaDbGetCurrentSession`, `govaDbSetAuth`, or other session IDB helpers directly.
- **Only** `SessionApiService` reads/writes session data in IndexedDB.
- **Do not** use token presence alone as session state in UI — use `useSession()` or `sessionService.getCurrentSession()`.

---

## Auth Service (HTTP only)

**Client:** `AuthApiService` — `govaApi.post()` to `/api/auth/*`  
**Server:** `AuthService` — credentials, token generation, repository

After refactor, `AuthApiService` **does not** persist sessions. Persistence is always:

```
authService.login()  →  sessionService.startSession()
authService.logout() →  sessionService.clearSession()
```

`authService.isAuthenticated()` delegates to `sessionService.getCurrentSession()` for backward compatibility.

---

## Hooks

| Hook | Layer | Purpose |
|---|---|---|
| `useSessionQuery()` | Hooks | React Query wrapper; `queryFn` = `restoreSession()` |
| `useSession()` | Hooks | Convenience: `session`, `isAuthenticated`, `isGuest` |
| `useLogin()` | Hooks | Login form + `startSession()` on success |
| `useRegister()` | Hooks | Register + auto-login + `startSession()` |
| `useLogout()` | Hooks | API logout + `clearSession()` |

### Query key

```typescript
export const CURRENT_SESSION_QUERY_KEY = ['current_session'] as const;
```

Invalidate this key after login, register, or logout:

```typescript
queryClient.invalidateQueries({ queryKey: CURRENT_SESSION_QUERY_KEY });
```

`AUTH_STATUS_QUERY_KEY` is a deprecated alias for the same key.

### App startup restore

`SessionRestore` (`src/features/auth/components/SessionRestore.tsx`) is mounted in `AppShell`. It calls `useSessionQuery()` so every in-app route restores session from IndexedDB on load — including page reload and Capacitor cold start.

---

## User flows

### Login

```
LoginPageContent
  → useLogin()
    → authService.login(formData)          // POST /api/auth/login
    → sessionService.startSession({...})   // IDB write
    → endGuestSession()
    → invalidateQueries(['current_session'])
  → redirect /home
```

### Register

```
RegistrationPageContent
  → useRegister()
    → authService.register(formData)       // POST /api/auth/register
    → authService.login(same credentials)  // auto-login
    → sessionService.startSession({...})
    → endGuestSession()
    → invalidateQueries(['current_session'])
```

Registration **always** starts a session immediately (register alone does not leave the user as guest).

### Logout

```
AppSidebar
  → useLogout()
    → authService.logout()       // POST /api/auth/logout (server no-op)
    → sessionService.clearSession()
    → invalidateQueries(['current_session'])
```

### Page reload / Capacitor restart

```
AppShell mounts SessionRestore
  → useSessionQuery()
    → sessionService.restoreSession()
    → reads GovaDB auth/current
    → authenticated if valid token+uid, else guest
```

No re-login required while the IDB record remains.

---

## UI: sidebar behaviour

**Component:** `src/components/layouts/AppSidebar.tsx`  
**Hook:** `useSession()`

| State | Visible items |
|---|---|
| **Guest** | Login, Settings |
| **Authenticated** | User info (displayName / phone), Logout, Settings |

Register is **not** shown in the sidebar (users reach registration from the login page).

---

## Quick start for developers

### Read session in a client component

```tsx
'use client';

import { useSession } from '@/features/auth/hooks/use-session-query';

export function MyComponent() {
  const { session, isAuthenticated, isLoading } = useSession();

  if (isLoading) return null;
  if (!isAuthenticated) return <p>Guest</p>;

  return <p>Hello, {session.displayName}</p>;
}
```

### Start session after a custom auth flow (from a Hook only)

```typescript
import { sessionService } from '@/features/auth/services/session-service';
import { CURRENT_SESSION_QUERY_KEY } from '@/features/auth/hooks/use-session-query';

// Inside a hook mutation onSuccess — never from UI directly:
await sessionService.startSession({
  token: result.token,
  uid: result.uid,
  phone: result.phone,
  displayName: result.phone,
});
queryClient.invalidateQueries({ queryKey: CURRENT_SESSION_QUERY_KEY });
```

### Update display name

```typescript
await sessionService.updateSession({ displayName: 'New Name' });
queryClient.invalidateQueries({ queryKey: CURRENT_SESSION_QUERY_KEY });
```

### Clear session (logout pattern)

```typescript
await authService.logout();
await sessionService.clearSession();
queryClient.invalidateQueries({ queryKey: CURRENT_SESSION_QUERY_KEY });
```

Prefer `useLogout()` in UI instead of calling these directly.

---

## What NOT to do

| Anti-pattern | Why |
|---|---|
| `govaDbSetAuth({ authToken })` from hooks/UI | Bypasses Session Service; breaks SSOT |
| `localStorage.setItem('token', …)` | Not the architecture; not persisted across GOVA tooling |
| Zustand store as session SSOT | React Query/Zustand are caches only |
| `useAuthQuery().data === true` as only check | Use `useSession().isAuthenticated` and full `CurrentSession` |
| Server session in SQLite/Turso for client auth | Out of scope; client token is IDB-only today |
| Import `@capacitor/*` for session | Platform layer must stay separate |

---

## File map

```
src/features/auth/
├── entities/
│   ├── session.entity.ts       # CurrentSession, guest helpers
│   └── user.entity.ts          # Server user row shape
├── services/
│   ├── session-service.interface.ts
│   ├── session-api-service.ts  # IDB owner
│   ├── session-service.ts      # sessionService export
│   ├── auth-api-service.ts     # HTTP only
│   ├── auth-service.ts         # authService export
│   └── auth-service.server.ts  # Server business logic
├── hooks/
│   ├── use-session-query.ts    # useSession, useSessionQuery
│   ├── use-login.ts
│   ├── use-register.ts
│   ├── use-logout.ts
│   └── use-auth-query.ts       # deprecated re-exports
└── components/
    └── SessionRestore.tsx      # App startup restore

src/lib/gova-db/index.ts        # Low-level IDB (session helpers)
src/components/layouts/
    AppSidebar.tsx              # Session-aware menu
    AppShell.tsx                # Mounts SessionRestore
```

---

## Platform notes

| Target | Session behaviour |
|---|---|
| **Development** (`npm run dev`) | Same — IDB in browser |
| **Vercel** | Same — client-only IDB |
| **Static export / GitHub Pages** | Same — IDB; API via `NEXT_PUBLIC_GOVA_API_BASE_URL` |
| **Capacitor** | Same — WebView IndexedDB; session survives app restart |

Session logic lives entirely in `src/` client code. No Capacitor plugins required for sessions.

---

## Monitoring (development)

Auth hooks pass `meta` to TanStack Query (`auth-monitor-meta.ts`). GovaDB session reads/writes appear in `/dev/monitor` under the **cache** layer via `gova-db-monitor.ts`.

---

## Related documentation

- [data-architecture-guide.md](./data-architecture-guide.md) — layers, GovaApiClient, GovaDB overview
- [capacitor.md](./capacitor.md) — mobile shell (session unchanged)
- [theme-system.md](./theme-system.md) — theme init (separate from session)
