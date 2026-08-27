# Runtime & Execution Flows

## 1. User Interaction & Touch Flow

```text
[User Touch Event]
       │
       ▼
[DOM Element with data-ui-* attributes] (UiRegistry diagnostic identity)
       │
       ▼
[React UI Component] (Uses active: / focus-visible: styles; NO hover)
       │
       ▼
[Page Snapshot Provider] (Captures UI scroll & state changes)
       │
       ▼
[Custom Hook / React Query] (Optimistic state update)
```

- **Touch Interaction Contract**: All interactions are touch-first. Hover states, hover-triggered menus, and cursor-pointer styles are forbidden across all surfaces.

---

## 2. Authentication & Session Flow

```text
[Client Login Form] (Phone / Email + Password / OTP)
       │
       ▼
[AsolApiClient.post('/api/auth/login')]
       │
       ▼
[Next.js App Router: src/app/api/auth/login/route.ts]
       │
       ▼
[Auth Service -> @asol/auth-core] (Verify password hash / OTP token)
       │
       ▼
[@asol/data-core -> Users Shard] (Read/update user session)
       │
       ▼
[Generate Signed Session Cookie] (HMAC-SHA256 via @asol/signed-token-core)
       │
       ▼
[Client receives HTTP-Only Cookie + Auth Context update]
```

---

## 3. Microservice Read Routing Flow (`service-bridge`)

```text
[Client UI requests Catalog / Orders / Profile Data]
       │
       ▼
[AsolApiClient -> Service Bridge Module]
       │
       ├── Product Reads   ──► https://asol-products.vercel.app/api/products
       ├── Order List      ──► https://asol-orders.vercel.app/api/orders
       ├── Profile Reads   ──► https://asol-profiles.vercel.app/api/profile
       │
       └── All Writes & Enriched Reads ──► https://gova-swart.vercel.app/api/...
```

- **Why reads go to services**: High-traffic read requests are offloaded to dedicated Vercel accounts and dedicated Turso read replicas.
- **Why writes stay on `gova`**: Mutations often span multiple shards (e.g. creating an order updates orders shard, product inventory, and merchant profile stats) and require central transactional consistency.

---

## 4. Push Notification Delivery Flow (`notification-bridge`)

```text
[Main App (gova)] Event occurs (e.g., Order Placed, Merchant Chat Message)
       │
       ▼
[Gova Server: Evaluates recipient UIDs & notification payload]
       │
       ▼
[Gova Server: Generates HMAC-Signed Delivery Grant via ASOL_NOTIFICATION_GRANT_SECRET]
       │
       ▼
[Grant passed to Client Browser via API response or WebSocket]
       │
       ▼
[Client Notification Bridge -> asol-notifications Service]
       │ (Sends Grant + Payload over HTTPS)
       ▼
[asol-notifications: Validates HMAC Signature]
       │
       ▼
[Dispatches to Platform Push Gateway]
       ├── Web Push (VAPID / web-push)
       ├── Android (FCM HTTP v1 via Google Auth)
       └── iOS (APNs via Apple Push Notification Service)
```

- **Key Security Invariant**: `gova` owns the user data but holds no push credentials. `asol-notifications` holds credentials but cannot create grants on its own. The client carries the tamper-proof grant.

---

## 5. Page Form Save Flow (`@asol/page-save-core`)

```text
[User Edits Form (e.g., Merchant Profile or Product Listing)]
       │
       ▼
[Page Save Hook -> @asol/page-save-core Gateway]
       │
       ├── 1. Client Validation against domain Zod schema
       ├── 2. Save Journal Recovery check (prevents state loss on crash)
       └── 3. Dispatches payload to server
       │
       ▼
[Server API Route -> Server Port Adapter]
       │
       ▼
[Domain Repository in @asol/data-core -> Turso Shard Write]
       │
       ▼
[Client receives 200 OK -> Journal cleared -> UI Snapshot updated]
```

---

## 6. Media Upload & Storage Flow

```text
[Client Image Picker (Camera / Gallery via @asol/native-core)]
       │
       ▼
[Image Compression (heic-to / Canvas resize)]
       │
       ▼
[AsolApiClient -> POST /api/storage/presigned-url]
       │
       ▼
[@asol/storage-core -> Generates AWS S3 / Cloudflare R2 Presigned PUT URL]
       │
       ▼
[Client Direct Upload to Cloudflare R2 Bucket]
       │
       ▼
[Client registers Storage Key with entity (Product / Avatar / Banner)]
```

---

## 7. Static Export & Capacitor Native Build Flow

```text
[npm run build:static]
       │
       ├── 1. Executes Next.js static export -> generates `out/`
       └── 2. Validates zero dynamic server routes exist in `out/`
       │
       ▼
[npm run cap:sync]
       ├── 1. Asserts `out/` exists and is valid
       ├── 2. Syncs Android push notification assets & icons
       ├── 3. Validates Android backup rules & ProGuard/R8 policies
       ├── 4. Validates iOS push credentials & normalizes SPM paths
       └── 5. Copies static `out/` into android/app/src/main/assets/public and ios/App/public
       │
       ▼
[Fastlane / Gradle / Xcode CLI]
       ├── fastlane:android:aab:signed -> Signed Android App Bundle for Google Play
       └── fastlane:ios:build -> Signed IPA / TestFlight upload
```

---

## 8. OTA Update Distribution Flow (`@asol/ota-core`)

```text
[Developer runs: npm run ota:publish]
       │
       ├── 1. Packages updated static `out/` into versioned zip bundle
       ├── 2. Signs zip bundle using private RSA/Ed25519 OTA signing key
       ├── 3. Uploads bundle & signed manifest to Cloudflare R2 OTA bucket
       └── 4. Updates ota-manifest.json
       │
       ▼
[Installed Client App starts up]
       │
       ▼
[@asol/ota-core Client checks remote ota-manifest.json]
       │
       ├── Validates bundle checksum & signature against embedded public key
       ├── Checks native plugin compatibility baseline
       ├── Downloads and unzips payload in background
       └── Activates new web assets on next app launch
```
