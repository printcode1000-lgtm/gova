> **Note:** Operational detail relocated here during the 2026-08 architecture reconstruction. Architectural relationships: [docs/01-architecture/](../01-architecture/README.md).

# `@asol/auth-core` Architecture & Consolidation

## 1. Summary & Core Mission

`@asol/auth-core` is the sealed workspace package that owns authentication domain logic for ASOL: password hashing, signed session tokens, registration/login/profile validation schemas, canonical international phone validation and normalization, auth operations, and account deletion orchestration.

Located at `packages/auth-core/`, it replaces scattered auth utilities that previously lived under `src/features/auth/` and `src/features/account-deletion/`. The app wires concrete repositories and storage ports through `src/features/auth/server/auth-core-bootstrap.server.ts`.

This migration was done without backward compatibility: legacy SHA-256 password hashes are rejected, minimum password length is **4**, and sensitive mutations require a fresh HMAC `sessionToken`.

---

## 2. Package Boundaries & Public Surface

`@asol/auth-core` exposes exactly two sealed entry points:

| Door | Import | Safe for | Contents |
| :--- | :--- | :--- | :--- |
| Browser / shared | `@asol/auth-core` | Client components, hooks, shared validation | Constants, entities, canonical phone validation/normalization, Zod schemas (`createRegistrationSchema`, `createLoginSchema`, `createProfileSchema`) |
| Server | `@asol/auth-core/server` | API routes, server services, bootstrap | Password hashing (scrypt), session token sign/verify, `AuthOperationsService`, `AccountDeletionService`, normalization helpers, super-admin guards |

**Do not** deep-import from `packages/auth-core/src/**`. Use only the two doors above, per [module-isolation-rules.md](../01-architecture/02-packages/module-isolation-rules.md).

---

## 3. What Moved Into the Package

### Previously in the app (removed)

| Old location | Replacement |
| :--- | :--- |
| `src/features/auth/utils/password-hash.server.ts` | `hashPassword` / `verifyPassword` in `@asol/auth-core/server` |
| `src/features/auth/services/signed-session-token.server.ts` | `createSignedSessionToken` / `verifySignedSessionToken` |
| `@asol/auth-core` (inline schemas) | Re-exports from `@asol/auth-core` |
| `@asol/auth-core` (inline schemas) | Re-exports from `@asol/auth-core` |
| `src/features/account-deletion/**` (entire feature folder) | `src/features/auth/presentation/AccountDeletionPageContent.tsx`, `account-deletion-api-service.ts`, bootstrap wiring |

### Still in the app (by design)

| Location | Role |
| :--- | :--- |
| `src/features/auth/server/auth-core-ports.server.ts` | Registers session signing secret and super-admin identity before token use |
| `src/features/auth/server/auth-core-bootstrap.server.ts` | Binds Turso repositories + image deletion port → exports `authOperationsService`, `accountDeletionService` |
| `src/features/auth/services/auth-service.server.ts` | Thin server facade delegating to `authOperationsService` |
| `packages/data-core/src/domains/account-deletion/` | SQL/data deletion implementation (`AccountDeletionRepositoryPort` adapter) |
| `src/features/auth/services/session-api-service.ts` | IndexedDB session persistence (client-only; not part of auth-core) |

---

## 4. Security Model

### Phone numbers

- `packages/auth-core/src/domain/phone.ts` is the single source of truth for phone validation and normalization, worldwide. It wraps `libphonenumber-js/max` — the `max` metadata set, because it is the only one that validates the national digits themselves rather than just their count.
- Registration, login, profile validation, server auth operations, password recovery, and the profile contact search keys all use this same owner; consumers must not copy its prefixes, regexes, length checks, or normalization rules.
- **The canonical storage form is E.164** (`+201026546550`). Every country is accepted. A number typed without a country code is read against Egypt (`DEFAULT_PHONE_COUNTRY`), so an existing account typing `01026546550` still resolves to `+201026546550`; `0020…` and `+20…` reach the same value.
- `packages/auth-core/src/domain/digits.ts` folds Arabic-Indic (`٠١٢٣٤٥٦٧٨٩`) and Persian (`۰۱۲۳۴۵۶۷۸۹`) digits to ASCII before anything is parsed, stored, or compared. A number typed on an Arabic keyboard is the same number.
- `phoneValidationIssue` reports `required`, `country` (a calling code nobody assigns), `length`, or `invalid` (right length, wrong digits for that country); the Zod schemas map each to its own message key.
- `samePhone` is how two spellings of one number are compared. Server identity checks use it rather than `===` because a session token signed before the migration still carries the national spelling for its 30-day life.
- `phoneSearchKey` is the lookup key: the E.164 digits without `+`. A value that cannot be parsed keys on its digits without leading zeros, so a national spelling stays a suffix of the international one and a `LIKE` search still finds a row the migration has not reached.
- `authPhoneCandidates` returns the raw, canonical, and legacy national spellings, so a lookup matches rows written before the migration.
- `@asol/auth-core/phone` is a door of its own for consumers that only read, compare, or key a number — `@asol/data-core` profile contact rows use it — so they pull in the phone value object without the validation schemas.
- Invalid server-side inputs are rejected even if a caller bypasses the browser Zod schema.

### Phone migration to E.164

- `packages/data-core/src/core/database/migrations/0012_phone_e164.sql` rewrites `users.phone`, and `packages/data-core/src/core/database/profile/migrations/0014_phone_e164_search_keys.sql` rewrites the profile display values and search keys. Both are deterministic: every account created before the migration is an Egyptian number.
- Deployed Turso databases take rows from `npm run db:migrate:phones-e164` (dry run by default, `--apply` to write). Schema sync applies DDL only and never rewrites rows.
- Pending password-recovery challenges hash the normalized phone, so any challenge open at the moment of the migration expires unused; they live for ten minutes.

### Passwords

- Format: `scrypt$<salt>$<hash>` (Node `scrypt` with project parameters).
- No migration path from older SHA-256 hashes. Existing accounts must reset password (recovery flow or manual DB update).
- `MIN_PASSWORD_LENGTH` = **4** (enforced in schemas and server services).
- `readPasswordInput` / `assertPasswordMeetsMinimum` reject non-string API payloads so leading zeros in values such as `0258` are preserved.

### Session tokens

- 30-day HMAC-signed payload: `{ uid, phone, exp }`.
- Issued on successful password login; stored in Asol IndexedDB with the local session.
- **No server-side session table** — verification is signature + expiry only.
- Required on sensitive routes via header `x-asol-session-token`:
  - `PUT /api/auth/profile`
  - `PUT /api/profile/editor`
  - `POST /api/account/delete`

`registerSessionSigningSecret()` must run (via `auth-core-ports.server.ts`) before any server code calls `createSignedSessionToken`.

### Account deletion

- Confirmation phrases (either is valid): `DELETE ASOL ACCOUNT` or `احذف حساب أصول نهائيا`.
- Requires current password + matching `sessionToken` + final UI warning.
- Super Admin identity cannot be deleted from the public deletion page.
- On success, client runs `clearAllClientStorage()` (session, cart, favorites, IndexedDB, cookies). Normal logout does **not** clear all client storage.
- Deletion registry: `packages/auth-core/src/domain/account-deletion-registry.ts` (`ACCOUNT_DELETION_TABLE_REGISTRY`, `ACCOUNT_DELETION_IMAGE_SOURCES`).
- Contract test: `npm run test:account-deletion-registry` — migrations must stay in sync with the registry.

See [contact-and-account-deletion.md](../00-overview/contact-and-account-deletion.md) for the full deletion data inventory.

---

## 5. Services & Ports

### `AuthOperationsService`

Handles registration (including optional store-name seed onto the profile identity columns), login, profile update, email/phone normalization, and `getUserPhone(uid)` (server-only via `AuthService`, not the client `IAuthService` facade). Depends on `AuthUserRepositoryPort`, `ProfileSpecialtiesPort`, and `ProfileStoreNamePort` (injected in bootstrap).

### `AccountDeletionService`

Orchestrates pre-checks (password, phrase, super-admin block, session match) then executes `ACCOUNT_DELETION_STEP_ORDER`:

- `AccountDeletionRepositoryPort` — DB cleanup across user, profile, product, and order domains.
- `ImageDeletionPort` — removes stored images with retry (default 3 attempts); failures are returned in `imagesFailed` and logged.

Repository implementation: `packages/data-core/src/domains/account-deletion/repositories/account-deletion-repository.server.ts`.

---

## 6. App Integration Map

```
packages/auth-core/
  src/index.ts          → browser door
  src/server.ts         → server door
  src/tests/index.test.ts

src/features/auth/
  server/auth-core-ports.server.ts      → secret + super-admin registration
  server/auth-core-bootstrap.server.ts  → repository wiring
  services/auth-service.server.ts       → login/register facade
  services/account-deletion-api-service.ts
  components/AccountDeletionPageContent.tsx
  hooks/use-login.ts, use-register.ts, use-logout.ts, use-profile-registration.ts

src/app/api/auth/login/route.ts
src/app/api/auth/profile/route.ts
src/app/api/account/delete/route.ts
```

### Registration UI

The optional email and alias (store name) fields sit inside a native collapsible
section labeled `Optional`, collapsed by default. Expanding it reveals the email
input with its password-recovery explanation, and the alias input. Both remain
part of the same registration form and validation contract.

A non-empty alias is persisted during `AuthOperationsService.register` through
`upsertStoreDetails` — the same `user_profiles.store_name` / `store_name_search`
columns later edited on `/profile?mode=edit` in the Registration tab and the
Store identity tab. An empty or omitted alias writes nothing. The client
registration hook does not call `profileService.saveStoreDetails`; that write
belongs to page-save on the profile editor, not to account creation.

### Logout simplification

`AppSidebar` logout now calls only `useLogout()` (clear IDB session + React context). It no longer duplicates device unregister, theme resets, or `clearAllClientStorage()`.

---

## 7. Tests & Build Gate

```bash
npm run test:auth-core
```

Included in `npm run test`, `npm run build`, and `npm run build:static`.

Package tests cover: constants, international phone validation/normalization (Arabic and Persian digits, Egypt without a country code, other countries with one, the legacy migration, and `samePhone`), scrypt hash/verify, session token sign/verify, and export surface integrity (browser door must not expose server-only symbols).

---

## 8. Developer Checklist After Deploy

1. **Super Admin** — reset password if the DB still holds a pre-scrypt hash.
2. **All users** — perform at least one fresh login to obtain a valid `sessionToken` before profile edit or account deletion.
3. **Imports** — use `@asol/auth-core` or `@asol/auth-core/server` only; never import from `packages/auth-core/src/...` directly.

---

## Related

- [Session system](../05-platform-features/session-system.md)
- [Contact and account deletion](../00-overview/contact-and-account-deletion.md)
- [Module isolation rules](../01-architecture/02-packages/module-isolation-rules.md)
- [Password recovery](../05-platform-features/password-recovery-system.md)
