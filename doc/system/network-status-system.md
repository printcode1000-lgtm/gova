# Network Status System

GOVA has a centralized, platform-agnostic network status system that covers every page and every Business API request. It works in the browser, static exports, Android, and iOS without importing Capacitor into application code.

The system has four responsibilities:

1. Detect whether the device is offline.
2. Verify that the GOVA backend is actually reachable.
3. Show a global, translated status banner on every page.
4. Convert low-level fetch failures into consistent application errors.

## Architecture

```text
Root Layout
  → NetworkStatusProvider
    → navigator online/offline events
    → visibility changes
    → periodic health check
      → NetworkApiService
        → GovaApiClient
          → GET /api/health

Any Business API request
  → GovaApiClient
    → device offline check
    → HTTP request
    → normalized network error

NetworkStatusBanner
  ← useNetworkStatus()
  ← translated Arabic/English messages
```

The feature follows the enforced GOVA data path:

```text
UI → Hook / Provider → Client Service → GovaApiClient → Business API
```

No component calls `fetch()` directly.

## Status Model

The provider exposes four states:

| Status | Meaning |
|---|---|
| `checking` | Initial connectivity check is running. |
| `online` | The device is online and the GOVA backend is reachable. |
| `offline` | `navigator.onLine` reports that the device has no network connection. |
| `server-unreachable` | The device reports a network connection, but the backend cannot be reached. This includes DNS, TLS, CORS, timeout, and server availability failures. |

The public hook returns:

```typescript
const {
  status,
  isOnline,
  isChecking,
  checkConnection,
} = useNetworkStatus();
```

## Provider Lifecycle

`NetworkStatusProvider` is mounted once in the root layout, so its state is shared by the entire application.

It checks connectivity:

- when the application first mounts;
- when the browser emits an `online` event;
- immediately when the browser emits an `offline` event;
- when the application becomes visible again;
- every 30 seconds while the application is visible;
- when the user presses **Try again**.

Only one health check is active at a time. Starting a new check aborts the previous request. A sequence counter prevents an older response from overwriting a newer state.

The provider also stops its timer, removes browser listeners, and aborts pending work when it unmounts.

## Health Endpoint

The backend exposes:

```text
GET /api/health
```

Successful response:

```json
{
  "status": "ok"
}
```

The endpoint does not access a database and does not require authentication. Its purpose is to prove that the Business API host is reachable.

During a gradual deployment, an older backend may return an HTTP `404` because it does not have `/api/health` yet. The network service treats any valid HTTP response as proof that the server is reachable. Transport failures have no HTTP status and remain connectivity failures.

The static build removes `src/app/api` from the exported client. Therefore, static and Capacitor builds call the remote backend configured by `NEXT_PUBLIC_GOVA_API_BASE_URL`.

## Global Banner

`NetworkStatusBanner` is rendered from the root layout and is available on every route.

### Offline

Displayed when the device reports no network connection:

> No internet connection. Check your network and try again.

### Server unavailable

Displayed when the device is connected but the backend health check fails:

> You are connected, but the GOVA server is currently unavailable.

### Connection restored

When the state changes from a disconnected state to `online`, a success message appears for three seconds:

> Internet connection restored.

The banner:

- uses `role="status"` and `aria-live="polite"`;
- stays above mobile bottom navigation;
- supports dark mode and theme tokens;
- includes a retry button;
- shows a spinner while a retry is running;
- supports Arabic and English automatically.

## API Error Normalization

`GovaApiClient` protects every Business API request.

### Device offline

Before starting an HTTP request, it checks:

```typescript
navigator.onLine === false
```

If the device is offline, it throws:

```typescript
NetworkOfflineError
```

Properties:

```text
name: NetworkOfflineError
code: NETWORK_OFFLINE
message: No internet connection
```

### Transport unavailable

Browser `fetch()` commonly throws a `TypeError` for failures such as:

- DNS resolution failure;
- TLS failure;
- blocked CORS request;
- unavailable backend;
- loss of connectivity during a request.

GovaApiClient converts that error to:

```typescript
NetworkUnavailableError
```

Properties:

```text
name: NetworkUnavailableError
code: NETWORK_UNAVAILABLE
message: Unable to reach the server
```

### HTTP errors

Valid HTTP error responses continue to use `ApiError` with their original status. For example, invalid credentials can still produce a `400` response and are not misclassified as a network failure.

### Aborted requests

`AbortError` is passed through unchanged. Aborting an old health check is expected behavior and must not change the global status.

### Logging

Failed Business API requests are logged without request bodies:

```text
[GovaApiClient] POST /api/auth/login failed: Unable to reach the server
```

Phone numbers, passwords, tokens, and request payloads are never logged.

In Android Studio Logcat, filter by:

```text
package:com.gova.app
```

Useful log tags and text:

```text
Capacitor/Console
GovaApiClient
```

Health checks suppress their own console errors because they run periodically and the global banner already reports their state.

## Internationalization

The following keys exist in both locale dictionaries:

| Key | Purpose |
|---|---|
| `network.offline` | Device has no connection. |
| `network.serverUnavailable` | Network exists but backend is unreachable. |
| `network.retry` | Manual retry button. |
| `network.checking` | Retry is in progress. |
| `network.restored` | Connection has returned. |

Files:

```text
src/locales/ar.json
src/locales/en.json
```

Any new network message must be added to both dictionaries.

## File Map

```text
src/
├── app/
│   ├── layout.tsx
│   └── api/health/route.ts
├── components/network/
│   └── NetworkStatusBanner.tsx
├── core/api/
│   ├── api-error.ts
│   ├── gova-api-client.ts
│   └── gova-api-routes.ts
├── features/network/
│   ├── hooks/
│   │   └── use-network-status.tsx
│   └── services/
│       └── network-api-service.ts
└── locales/
    ├── ar.json
    └── en.json
```

## Root Integration

The provider is inside `PreferencesProvider` because the banner uses the active locale and theme.

```tsx
<PreferencesProvider>
  <NetworkStatusProvider>
    <ShellLayout>{children}</ShellLayout>
    <NetworkStatusBanner />
  </NetworkStatusProvider>
</PreferencesProvider>
```

Do not mount a separate provider on individual pages. Multiple providers would create duplicate timers, duplicate health requests, and inconsistent status values.

## Using the Status in a Component

Most components do not need to check connectivity manually because GovaApiClient and the global banner already handle it.

When a component needs to change its presentation while offline:

```tsx
'use client';

import { useNetworkStatus } from '@/features/network/hooks/use-network-status';

export function SyncButton() {
  const { isOnline, isChecking, checkConnection } = useNetworkStatus();

  return (
    <button
      type="button"
      disabled={!isOnline || isChecking}
      onClick={() => void checkConnection()}
    >
      Sync
    </button>
  );
}
```

Do not use `navigator.onLine` directly in page components. The provider is the single source of truth because it combines device state with a real backend check.

## Static and Capacitor Behavior

### Local development

```text
UI → /api/health on the local Next.js server
```

### Static preview

```text
UI → local preview /api proxy → remote Vercel backend
```

### Android and iOS

```text
UI → HTTPS → remote Vercel backend
```

Capacitor remains a runtime shell only. The network system uses browser APIs and does not import `@capacitor/*`.

For Android, the Vercel CORS configuration must allow:

```text
https://localhost
```

Other supported Capacitor origins include:

```text
capacitor://localhost
http://localhost
ionic://localhost
```

If `GOVA_CORS_ORIGINS` is explicitly configured in Vercel, it replaces the default origin list. Include every required origin in that variable.

## Deployment

After changing the health endpoint or server CORS rules:

1. Deploy the server build to Vercel.
2. Verify `GET /api/health` returns `200`.
3. Verify the required Capacitor origins are present in CORS responses.

After changing client-side provider, banner, translations, or API error handling:

```bash
npm run cap:build
npm run cap:open:android
```

Run the application again from Android Studio to install the updated web bundle on the device.

## Verification

### Type and architecture checks

```bash
npm run typecheck
npm run architecture:check
```

The architecture score must remain 100%.

### Healthy connection

1. Start the development server.
2. Open any page.
3. Confirm no network banner is displayed.
4. Confirm `/api/health` returns `{ "status": "ok" }`.

### Backend unavailable

1. Keep the page open.
2. Stop the backend server.
3. Wait for the periodic check or return focus to the application.
4. Confirm the server-unavailable banner appears.
5. Start the backend and press **Try again**.
6. Confirm the restored message appears and disappears after three seconds.

### Device offline

1. Open the Android or iOS application.
2. Disable Wi-Fi and mobile data.
3. Confirm the offline banner appears.
4. Attempt a Business API action and confirm no request is sent.
5. Restore connectivity and confirm the application automatically rechecks the backend.

## Troubleshooting

### `Failed to fetch`

Inspect Android WebView network details or Logcat. Typical causes are:

- device has no active network;
- DNS cannot resolve the API host;
- Vercel CORS does not include the WebView origin;
- API base URL was not baked into the static build;
- the backend deployment is unavailable.

### `net::ERR_NAME_NOT_RESOLVED`

The device cannot resolve the backend hostname. Verify that the phone itself has working internet access by opening the backend URL in Chrome. This is not an application or CORS failure.

### Banner always reports server unavailable

Check:

1. `NEXT_PUBLIC_GOVA_API_BASE_URL` in the built client.
2. `GET /api/health` on the deployed backend.
3. CORS response headers for the current origin.
4. DNS and TLS access from the device.

### Browser reports online while internet is unavailable

This is expected on some Wi-Fi networks. `navigator.onLine` only reports network interface state. The health check is what distinguishes a connected interface from a reachable backend.

## Rules

| Do | Do not |
|---|---|
| Use `useNetworkStatus()` when UI needs connectivity state. | Read `navigator.onLine` independently in pages. |
| Send all HTTP traffic through GovaApiClient. | Call `fetch()` from components, hooks, or services. |
| Keep one provider in the root layout. | Mount providers per page. |
| Add messages to Arabic and English dictionaries. | Hardcode user-facing network text. |
| Log method, route, and safe error details. | Log credentials, request bodies, or personal data. |
| Keep Capacitor as a shell. | Import Capacitor packages into application layers. |

## Future Extensions

Possible additions that fit the current architecture:

- persist the last successful health-check timestamp;
- show stale-data indicators for IndexedDB or TanStack Query cache;
- queue explicitly approved write operations for retry;
- expose connection quality and request latency;
- add automated provider tests with mocked browser events;
- add a dedicated full-screen offline state when no cached content exists.

Offline write queues must not be added implicitly. Each mutation must define conflict handling, ordering, retry limits, and user visibility before it can be safely queued.
