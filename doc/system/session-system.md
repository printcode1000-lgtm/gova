# Session System

Client login state in GOVA is minimal:

- **Logged in** → `UserSession` in Gova IndexedDB (`auth` store, key `current`)
- **Not logged in** → no row in `auth/current` (`null`)
- **Guest browsing** → separate `guestSessions` store via `useGuestSession()` (“متابعة كضيف”)

**No token anywhere** — not in IDB, not in API responses, not in client code.

See [data-architecture-guide.md](./data-architecture-guide.md) for full layer architecture.

---

## Model

```typescript
interface UserSession {
  uid: string;
  phone: string;
  email?: string;  // only when present
}

type SessionState = UserSession | null;  // null = not logged in

function isLoggedIn(session: SessionState): boolean {
  return session !== null && !!session.uid;
}
```

---

## Flow

```
Login / Register
  → authService.login()           // returns { uid, phone, email }
  → sessionService.saveSession()  // writes auth/current in IDB
  → setSession()                  // React context (SessionProvider)

Logout
  → sessionService.clearSession() // deletes auth/current
  → setSession(null)

App load
  → SessionProvider.cleanLegacyStore() + getSession()
```

| Layer | Responsibility |
|---|---|
| `SessionApiService` | Only code that reads/writes `auth/current` |
| `SessionProvider` | Loads IDB on mount; exposes `useSession()` |
| `useLogin` / `useRegister` | API + `saveSession()` + `setSession()` |
| `useLogout` | `clearSession()` + `setSession(null)` |
| `useGuestSession` | Separate guest browsing id (`guestSessions` store) |

---

## IndexedDB

| Store | Key | Value |
|---|---|---|
| `auth` | `current` | `{ uid, phone, email? }` when logged in |
| `guestSessions` | `current` | Guest browsing id (unrelated to login) |

On first load, `cleanLegacyStore()`:

- Deletes legacy `auth` key (`authToken`)
- Removes `auth/current` rows that lack `uid` or contain old fields (`token`, `displayName`, …)
- Normalizes valid rows to `{ uid, phone, email? }` only

---

## Session Service API

**File:** `src/features/auth/services/session-api-service.ts`  
**Export:** `sessionService`

| Method | Effect |
|---|---|
| `cleanLegacyStore()` | One-time cleanup + normalize on app start |
| `getSession()` | Read `auth/current` → `UserSession \| null` |
| `saveSession({ uid, phone, email? })` | Write `auth/current` |
| `clearSession()` | Delete `auth/current` |

---

## `useSession()`

**File:** `src/features/auth/components/SessionProvider.tsx`

```tsx
const { session, isLoggedIn, isGuest, isLoading, setSession, refreshSession } = useSession();
```

Mounted in root `layout.tsx` inside `AppQueryProvider`.

---

## Login API

`POST /api/auth/login` returns:

```json
{ "uid": "...", "phone": "...", "email": "..." }
```

No `token` field.

---

## Profile

Profile page reads **from IDB session only** (`useSession()`).  
Saving profile updates server (`PUT /api/auth/profile`) and rewrites IDB via `saveSession()`.

---

## File map

```
src/features/auth/
├── entities/session.entity.ts       # UserSession, isLoggedIn, parseStoredSession
├── services/session-api-service.ts  # IDB owner
├── services/session-service.ts
├── components/SessionProvider.tsx   # useSession()
└── hooks/
    ├── use-login.ts
    ├── use-register.ts
    ├── use-logout.ts
    └── use-profile-registration.ts

src/hooks/use-guest-session.ts       # guestSessions (separate)
src/lib/gova-db/index.ts             # low-level IDB helpers
```

---

## Rules

| Do | Don't |
|---|---|
| Use `useSession()` in UI | Read IDB from components directly |
| Use `sessionService` from hooks | Store session in React Query or localStorage |
| Use `useLogout()` for logout | Call HTTP logout before clearing IDB |
| Keep guest browsing in `useGuestSession` | Mix guest id into `auth/current` |

---

## Related

- [data-architecture-guide.md](./data-architecture-guide.md)
- [capacitor.md](./capacitor.md)
