# Runtime & Execution Flows

## 1. User Interaction & Touch Flow

```text
[User Touch Event]
       │
       ▼
[DOM Element with its plain HTML id]
       │
       ▼
[React UI Component] (Uses active: / focus-visible: styles; NO hover)
       │ (Overlay Chrome: Wrapped in DismissableLayerBranch to prevent closing dialogs)
       ▼
[Page Snapshot Provider] (Captures UI scroll & state changes)
       │
       ▼
[Custom Hook / React Query] (Optimistic state update)
```

- **Touch Interaction Contract**: All interactions are touch-first. Hover states, hover-triggered menus, and cursor-pointer styles are forbidden across all surfaces.
- **Plain Source Ids**: elements carry the plain HTML `id` written in the source. A standalone DOM inspector reads it off the node; there is no registry, catalog or generated uid behind it.
- **Overlay Chrome Isolation**: Floating tools (DevBadge, SuperAdminUiAttributeInspector, Error button) set `data-asol-overlay-chrome` and do not close parent dialogs on touch.

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

## 3. Microservice Routing & Workload Partitioning Flow (`service-bridge`)

```text
[Client UI requests API Operation]
       │
       ▼
[AsolApiClient -> Service Bridge Module in @asol/account-bridge]
       │
       ├── Read Operations:
       │   ├── Product Reads     ──► https://asol-products.vercel.app/api/products
       │   ├── Order List        ──► https://asol-orders.vercel.app/api/orders
       │   └── Profile Reads     ──► https://asol-profiles.vercel.app/api/profile/...
       │
       ├── Search & Checkout Workload (submain):
       │   ├── Search Queries    ──► https://asol-submain.vercel.app/api/search/...
       │   └── Order Placements  ──► https://asol-submain.vercel.app/api/orders/from-cart
       │
       ├── Merchant Mutations Workload (sub2main):
       │   ├── Product Writes    ──► https://asol-sub2main.vercel.app/api/products [POST/PUT/DELETE]
       │   ├── Profile Updates   ──► https://asol-sub2main.vercel.app/api/profile/editor [PUT]
       │   └── Direct Media Put  ──► https://asol-sub2main.vercel.app/api/storage/images/upload
       │
       └── Central Authority (gova main):
           ├── Auth & Session    ──► https://gova-swart.vercel.app/api/auth/...
           ├── Super Admin Ops   ──► https://gova-swart.vercel.app/api/super-admin/...
           └── Grant Signing     ──► https://gova-swart.vercel.app/api/notifications/grant
```

- **Workload Partitioning**: Dedicated microservice deployments prevent high-volume catalog browsing and checkout traffic from exhausting serverless execution limits or database connection pools on the primary authentication authority.

---

## 4. Push Notification Delivery Flows (`notification-bridge`)

### Path A: Server Delivery via `asol-notifications` Service
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

### Path B: Native Direct Mobile Push Delivery
```text
[Capacitor Native App (Android / iOS)]
       │
       ▼
[Direct Delivery: deliverNotificationGrantsFromNative in @asol/account-bridge]
       │
       ├── Reads encrypted local credential store (ensureMobilePushCredentials)
       ├── Obtains FCM Access Token via OAuth2 Service Account
       └── Dispatches FCM HTTP v1 / APNs messages directly from device
```

- **Key Security Invariant**: `gova` owns user data but holds no push credentials. `asol-notifications` holds credentials but cannot generate grants without the shared HMAC secret.

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

---

## 9. Deploy-All Wave Orchestration & Resume Checkpoint Flow

```text
[Developer runs: npm run deploy:all]
       │
       ▼
[Phase 1: Preflight Wave]
       ├── Documentation Gate (docs:ci)
       ├── Architecture Gate (architecture:check)
       ├── Contract & Unit Tests Gate (npm run test)
       ├── Runtime Compatibility Gate (runtime:check)
       └── Storage Profiles Gate (validate-storage-profiles)
       │
       ▼
[Phase 2: Service Mirror Sync & Build]
       └── Sync sources into services/* via @asol/service-mirror-core
       │
       ▼
[Phase 3: Service Deployments Wave (notifications, products, orders, profiles, submain, sub2main)]
       └── Checkpoint recorded on disk per branch upon successful Vercel deploy
       │
       ▼
[Phase 4: Main Application Deployment (gova)]
       └── Deploy main Next.js web application to Vercel
       │
       ▼
[Phase 5: Post-Deploy Smoke Verification]
       └── Run smoke:services, smoke:production, smoke:deployed
       │
       ▼
[Phase 6: Mobile Builds & OTA Publish]
       └── Fastlane mobile bundles & ota:publish
```

- **Branch Checkpoint & Resume**: If an intermediate phase fails (e.g. temporary Vercel deploy timeout on one service), the state is recorded. Rerunning `deploy:all` or `--branch=<name>` skips completed branches whose input hashes match and resumes execution from the smallest failed branch.

---
