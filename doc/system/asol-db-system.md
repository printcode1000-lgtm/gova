# AsolDB (IndexedDB) System

Asol uses IndexedDB (AsolDB) as its primary client-side persistent storage mechanism. LocalStorage is strictly forbidden to ensure consistent behavior across platforms (especially Capacitor/mobile webviews where LocalStorage can be cleared unpredictably by the OS).

---

## Configuration

- **Database Name:** `AsolDB`
- **Current Version:** `5`
- **Low-level Implementation:** `src/lib/asol-db/index.ts`
- **Object Stores Schema:** Every object store is configured with `{ keyPath: 'key' }` and stores key-value pairs (where value can be a structured cloneable object).

---

## Object Stores and Keys

AsolDB is divided into core stores plus bounded feature stores:

### 1. `appSettings`
The general key-value store used to persist application state, settings, user preferences, OTA updates, and developer utility configurations.

| Key | Value Type | Description |
|-----|------------|-------------|
| `theme-preferences` | `ThemePreferences` | Visual theme settings: `{ themeMode: 'light' \| 'dark', fontSize: number, density: ThemeDensity, highContrast: boolean }` |
| `app-preferences` | `AppPreferences` | App preference settings: `{ locale: Locale }` |
| `ota-state` | `OtaStoredState` | Persistent OTA update state: `{ pending?, failedReleaseId?, activation? }` |
| `asol-dev-splash-nav-toggle` | `boolean` | Developer toggle to enable or disable automatic splash screen navigation to home. |
| `monitor-theme` | `'light' \| 'dark'` | Active theme for the developer live logs monitor panel. |

### 2. `auth`
Stores user authentication session state.

| Key | Value Type | Description |
|-----|------------|-------------|
| `current` | `UserSession \| null` | Authenticated session info: `{ uid, phone, email? }` |

### 3. `guestSessions`
Manages guest browsing identifiers.

| Key | Value Type | Description |
|-----|------------|-------------|
| `current` | `GuestSessionData` | Guest identifier for tracking and browsing without registration: `{ id, createdAt }` |

### 4. `sellerOnboarding`
Caches partial form state and draft applications during the seller registration process to prevent data loss.

### 5. `queryCache`
Persists serialized React Query cache payloads for offline readiness.

### 6. Notification stores
The notification module stores its local state in dedicated AsolDB stores. Templates are not stored in IndexedDB; they live as JSON files in the notification module.

| Store | Description |
|-------|-------------|
| `notifications` | Per-user notification center entries, read/unread state, routes, grouping keys, dedupe keys, and sync state. |
| `notificationDeviceTokens` | Per-user platform device tokens for web, Android, and iOS. No provider secrets are stored here. |
| `notificationSettings` | Per-user notification channel and target preferences. |
| `notificationBadges` | Per-user unread badge count. |
| `notificationAnalytics` | Local lifecycle analytics events such as sent, displayed, opened, clicked, dismissed, and failed. |
| `notificationOfflineQueue` | Local operations waiting for browser connectivity. |

---

## Core Database APIs

`src/lib/asol-db/index.ts` exposes the following asynchronous helper functions:

```typescript
// Read value associated with a key from a store
export async function asolDbGet<T>(storeName: AsolDbStoreName, key: string): Promise<T | null>;

// Write or update value associated with a key in a store
export async function asolDbSet<T>(storeName: AsolDbStoreName, key: string, value: T): Promise<void>;

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
1. `body` visibility defaults to `opacity: 0` in CSS.
2. `ThemeProvider` reads `theme-preferences` asynchronously and applies visual variables, then sets `data-theme-hydrated="true"` on `<html>`.
3. `PreferencesProvider` reads `app-preferences` asynchronously and applies language/direction, then sets `data-app-hydrated="true"` on `<html>`.
4. CSS reveals the app body via a transition when both attributes are `"true"`:
   ```css
   html[data-theme-hydrated="true"][data-app-hydrated="true"] body {
     opacity: 1;
     pointer-events: auto;
   }
   ```

---

## Guidelines for Developers

1. **Never use LocalStorage.** Use `asolDbGet` / `asolDbSet` with the `appSettings` store instead.
2. **Handle Promises.** All AsolDB actions return a Promise and must be awaited or chained with `.then()`.
3. **Structured Cloning.** Do not attempt to store functions, promises, or non-serializable objects in the database.
