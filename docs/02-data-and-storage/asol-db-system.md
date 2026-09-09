# AsolDB (IndexedDB) System

## Purpose

Preserved operational and architectural detail, relocated here during the 2026-08 architecture reconstruction. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../01-architecture/README.md) where applicable.

---

Asol uses IndexedDB (AsolDB) as its primary client-side persistent storage mechanism. LocalStorage is strictly forbidden to ensure consistent behavior across platforms (especially Capacitor/mobile webviews where LocalStorage can be cleared unpredictably by the OS).

---

## Configuration

- **Database Name:** `AsolDB`
- **Current Version:** `12`
- **Low-level Implementation:** `packages/data-core/src/browser/asol-db/index.ts`
- **Object Stores Schema:** Every object store is configured with `{ keyPath: 'key' }` and stores key-value pairs (where value can be a structured cloneable object).

### Version-skew safety

`@asol/data-core/browser` owns schema upgrades. If an already-open browser or WebView has a newer AsolDB version than the current bundle requests, the browser adapter handles IndexedDB `VersionError` by reopening the installed version without requesting a downgrade and verifies that every store required by the current bundle exists before using it. This protects an older live tab during a newer deployment while still failing closed for an incompatible schema.

The Web Push service worker does **not** own the global AsolDB version and must never upgrade the shared database for unrelated application stores. It opens the installed database version as-is and owns only `notifications`, `notificationSettings`, and `notificationBadges`. On a brand-new database it may create only those three stores; the application remains the sole owner of full schema upgrades.

---

## Object Stores and Keys

AsolDB is divided into core stores plus bounded feature stores:

### 1. `appSettings`
The general key-value store used to persist application state, settings, user preferences, OTA updates, and developer utility configurations.

| Key | Value Type | Description |
|-----|------------|-------------|
| `theme-preferences` | `ThemePreferences` | Visual theme settings: `{ themeMode: 'light' \| 'dark', fontSize: number, density: ThemeDensity, highContrast: boolean }` |
| `app-preferences` | `AppPreferences` | App preference settings: `{ locale: Locale }` |
| `asol-ota-state-v1` | `OtaStoredState` | Device-local OTA state: `{ pending?, failedReleaseId?, activation? }`. Release approval is never stored or trusted in IndexedDB. |
| `asol-dev-splash-nav-toggle` | `boolean` | Developer toggle to enable or disable automatic splash screen navigation to home. |
| `monitor-theme` | `'light' \| 'dark'` | Active theme for the developer live logs monitor panel. |

### 2. `auth`
Stores user authentication session state.

| Key | Value Type | Description |
|-----|------------|-------------|
| `current` | `UserSession \| null` | Authenticated session info: `{ uid, phone, email?, providerAccountEnabled, specialties, sessionToken? }`. `providerAccountEnabled` is a local session copy of the current user's persisted account mode; the authoritative value is `users.provider_account_enabled` in SQLite/Turso. The signed token is local-only and removed with the session. If a stored token's public payload names a different UID, bootstrap deletes that corrupted session; new session writes reject the same mismatch before persistence. |

### 3. `guestSessions`
Manages guest browsing identifiers.

| Key | Value Type | Description |
|-----|------------|-------------|
| `current` | `GuestSessionData` | Guest identifier for tracking and browsing without registration: `{ id, createdAt }` |

### 4. `sellerOnboarding`
Caches partial form state and draft applications during the seller registration process to prevent data loss.

### 5. `queryCache`
Persists the dehydrated TanStack Query client owned by `@asol/data-core/browser`. The cache uses a schema-version buster rather than a build id, so a deployment does not erase otherwise compatible data. The default persisted max age is seven days; normal revisits inside the local-first freshness window read from memory/AsolDB without a network request. A shared restoration barrier is awaited by both React Query hooks and imperative `AsolApiClient` browser GETs, so an early effect cannot race the IndexedDB restore and go to cloud first. Logout and invalid-session handling clear both the in-memory QueryClient and this durable snapshot.


### 6. Notification stores
The notification module stores its local state in dedicated AsolDB stores. Templates are not stored in IndexedDB; they live as JSON files in the notification module.

| Store | Description |
|-------|-------------|
| `notifications` | Per-user notification center entries, read/unread state, routes, grouping keys, dedupe keys, and sync state. |
| `notificationDeviceTokens` | Per-user platform device tokens for web, Android, and iOS. No provider secrets are stored here. |
| `notificationSettings` | Per-user notification channel and target preferences. It also stores the bounded `user:<uid>:dismissed` list of dismissed notification `id` and `dedupeKey` values so deleted local notifications are not re-imported from Web Push or Android tray payloads. |
| `notificationBadges` | Per-user unread badge count. |
| `notificationAnalytics` | Local lifecycle analytics events such as sent, displayed, opened, clicked, dismissed, and failed. |

Notification cards and specialty-chat message bodies have no SQLite/Turso table. Their sole application persistence is the `notifications` store in this IndexedDB database, including inside Capacitor WebViews.
| `notificationOfflineQueue` | Local operations waiting for browser connectivity. |

### 7. `imageUploadDrafts`

Stores the original `Blob` and safe file metadata for every image currently staged, queued, uploading, failed, or awaiting completion recovery in `StorageImageManager`. Keys are isolated by user, page, manager id, slot, storage profile, and storage scope. Completed and removed drafts are deleted, and logout clears the entire store.

### 8. `imageCache`

Stores downloaded remote image `Blob`s for the local-first image path. Each record carries the source URL, stable cache key, content type, byte length, ETag when available, storage/access timestamps, and expiry time. The cache is bounded by LRU pruning (default 96 MiB / 500 entries), never stores local/public/data/blob URLs, and may serve a stale local Blob when the network is unavailable. Expired R2 objects are conditionally revalidated with `If-None-Match`; a `304` refreshes metadata without downloading the Blob again.

---

## Core Database APIs

`packages/data-core/src/browser/asol-db/index.ts` exposes the following asynchronous helper functions:

```typescript
// Read value associated with a key from a store
export async function asolDbGet<T>(storeName: AsolDbStoreName, key: string): Promise<T | null>;

// Write or update value associated with a key in a store
export async function asolDbSet<T>(storeName: AsolDbStoreName, key: string, value: T): Promise<void>;

// Write structured-cloneable binary values such as Blob/File without JSON conversion
export async function asolDbSetStructured<T>(storeName: AsolDbStoreName, key: string, value: T): Promise<void>;

// Delete a key-value pair from a store
export async function asolDbDelete(storeName: AsolDbStoreName, key: string): Promise<void>;

// Clear all entries inside a single store
export async function asolDbClearStore(storeName: AsolDbStoreName): Promise<void>;

// Clear all entries in all object stores
export async function asolDbClearAll(): Promise<void>;
```

---

## Hydration Flow

Because IndexedDB queries are asynchronous, Asol coordinates hydration states on mount:
1. The blocking app-init script applies safe theme and locale defaults before first paint.
2. The server-rendered `body` remains visible while client hydration runs, so IndexedDB or React initialization failures cannot leave a blank screen.
3. `ThemeProvider` reads `theme-preferences` asynchronously and applies visual variables, then sets `data-theme-hydrated="true"` on `<html>`.
4. `PreferencesProvider` reads `app-preferences` asynchronously and applies language/direction, then sets `data-app-hydrated="true"` on `<html>`.

---

## Guidelines for Developers

1. **Never use LocalStorage.** Use `asolDbGet` / `asolDbSet` with the `appSettings` store instead.
2. **Handle Promises.** All AsolDB actions return a Promise and must be awaited or chained with `.then()`.
3. **Structured Cloning.** Do not attempt to store functions, promises, or non-serializable objects in the database.
4. **OTA approval is server-owned.** AsolDB may cache a downloaded/pending release, but `/api/ota/access` must authorize both download and activation. A local value must never grant approval.
