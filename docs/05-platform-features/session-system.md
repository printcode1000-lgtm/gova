# Session System

Client login state in ASOL is local-first and cryptographically verifiable for protected notification-chat operations:

- **Logged in** → `UserSession` in Asol IndexedDB (`auth` store, key `current`)
- **Not logged in** → no row in `auth/current` (`null`)
- **Guest browsing** → separate `guestSessions` store via `useGuestSession()` ("Continue as Guest")

The login response includes a 30-day HMAC-signed `sessionToken`. It is persisted only in AsolDB with the local session, is removed on logout/reset, and has no server session table.

See [data-layers/README.md](../01-architecture/data-layers/README.md) for full layer architecture.

---

## Model

```typescript
interface UserSession {
  uid: string;
  phone: string;
  email?: string;  // only when present
  specialties: ProfileSpecialtiesSelection;
  sessionToken?: string; // present after a new password login
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
  → authService.login()           // returns identity, specialties, signed sessionToken
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
| `auth` | `current` | `{ uid, phone, email?, specialties, sessionToken? }` when logged in |
| `guestSessions` | `current` | Guest browsing id (unrelated to login) |

On first load, `cleanLegacyStore()`:

- Deletes the obsolete legacy `auth` key.
- Removes `auth/current` rows that lack `uid`.
- Preserves a valid signed `sessionToken` and normalizes identity, email, and specialties.

---

## Session Service API

**File:** `src/features/auth/services/session-api-service.ts`  
**Export:** `sessionService`

| Method | Effect |
|---|---|
| `cleanLegacyStore()` | One-time cleanup + normalize on app start |
| `getSession()` | Read `auth/current` → `UserSession \| null` |
| `saveSession({ uid, phone, email?, specialties?, sessionToken? })` | Write `auth/current` |
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
{ "uid": "...", "phone": "...", "email": "...", "specialties": { "main": [], "sub": {} }, "sessionToken": "..." }
```

The token is signed server-side after password verification. The server validates its signature and expiry without storing a cloud session row. Sessions created before this feature remain usable for ordinary browsing, but specialty-chat mutations require one fresh login.

`PUT /api/auth/profile` and `POST /api/account/delete` require the same signed `sessionToken` via the `x-asol-session-token` header.

Passwords are stored with scrypt (`scrypt$...`) via `@asol/auth-core/server`. Minimum length is 4 characters.

---

## Profile

Profile page reads **from IDB session only** (`useSession()`).  
Saving profile updates server (`PUT /api/auth/profile`) and rewrites IDB via `saveSession()`.

---

## File map

```
packages/auth-core/
src/features/auth/
├── entities/session.entity.ts
├── services/session-api-service.ts
├── services/account-deletion-api-service.ts
├── components/AccountDeletionPageContent.tsx
├── server/auth-core-ports.server.ts
├── server/auth-core-bootstrap.server.ts
├── components/SessionProvider.tsx
└── hooks/
    ├── use-login.ts
    ├── use-register.ts
    ├── use-logout.ts
    └── use-profile-registration.ts

src/hooks/use-guest-session.ts
src/modules/data-access/browser/asol-db/index.ts
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

- [auth-core-module.md](../01-architecture/auth-core-module.md)
- [data-layers/README.md](../01-architecture/data-layers/README.md)
- [contact-and-account-deletion.md](../00-overview/contact-and-account-deletion.md)
