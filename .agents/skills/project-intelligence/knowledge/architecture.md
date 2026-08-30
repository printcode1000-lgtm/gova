# System Architecture & Invariants

## High-Level Architecture

The Gova application is architected around modular independence, sealed package boundaries, workload partitioning across microservices, and strict multi-runtime compatibility.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT RUNTIMES                                  │
│  Development (Next dev) │ Web (.next) │ Static out/ │ Android │ iOS         │
└───────────────────────┬──────────────────────┬──────────────────────────────┘
                        │                      │ (Client Bridge Routing)
        ┌───────────────▼──────────────┐       ▼
        │   Main App (gova / Vercel)   │ ┌────────────────────────────────────┐
        │ - User auth & sessions       │ │      Microservices Cluster         │
        │ - Super-admin operations     │ │ - asol-products (Read catalog)     │
        │ - Notification grant signing │ │ - asol-orders   (Read order list)  │
        │ - Storage presigned URL auth │ │ - asol-profiles (Read profiles)    │
        └───────────────┬──────────────┘ │ - asol-submain  (Search & checkout)│
                        │                │ - asol-sub2main (Merchant updates) │
      ┌─────────────────┴─────────────┐  │ - asol-notifications (Push deliv)  │
      ▼                               ▼  └────────────────────────────────────┘
┌──────────────┐             ┌────────┐
│ Turso Shards │             │   R2   │
│  (DB Data)   │             │ (Media)│
└──────────────┘             └────────┘
```

## The Five Runtime Targets

Every codebase change must be evaluated across all 5 surfaces:

1. **Development (`next dev --turbo --port 3001`)**:
   - Node.js runtime with Hot Module Replacement (HMR).
   - Optional Capacitor live reload on local emulators/devices.
2. **Web (`.next` server deployment)**:
   - Server-capable Next.js App Router deployed to Vercel (`gova`).
   - Serves SSR/RSC, App Router `/api/*` handlers, and dynamically authenticated pages.
3. **Static `out/` (`npm run build:static`)**:
   - Pre-rendered static HTML/JS/CSS client payload.
   - **Zero App Router API routes** bundled; client code communicates with remote API base URLs.
4. **Android (Capacitor shell)**:
   - Native Android application wrapper consuming static `out/` payload.
   - Enhanced with Capacitor plugins and native Java/Kotlin services (`packages/native-core/android/`).
   - Strict ProGuard/R8 shrinking and Android auto-backup rules enforced.
5. **iOS (Capacitor shell)**:
   - Native iOS application wrapper consuming static `out/` payload.
   - Enhanced with native Swift plugins and Swift Package Manager (`CapApp-SPM`).

## Layered Application Stack

Application code (`src/`) strictly follows an unidirectional layer flow enforced by `packages/architecture-core`:

```text
[ Presentation Layer ]
  UI Components (React Server/Client Components)
      │
      ▼
  Custom React Hooks
      │
      ▼
[ Client Application Layer ]
  Client Services & Port Adapters
      │
      ▼
  AsolApiClient (Centralized HTTP Client & Gateway)
      │
      ▼ (Network Boundary)
[ Server Application Layer ]
  Next.js Business APIs (/api/* Routes)
      │
      ▼
  Server Services & Business Logic
      │
      ▼
  Command / Query Handlers
      │
      ▼
[ Persistence Layer ]
  Domain Repositories (Data Access)
      │
      ▼
  Database Client (Drizzle ORM Engine & CachedSqliteConnection)
      │
      ▼
  Storage Engine (Turso LibSQL / Better-SQLite3)
```

**Enforced Layer Rules**:
- UI components MUST NOT directly import repositories, Drizzle ORM, or database clients.
- `fetch()` calls outside `AsolApiClient` are strictly prohibited in application code.
- Raw SQL and Drizzle queries MUST live inside `@asol/data-core` domain repositories.

## Middleware, Proxy & Server Initialization

1. **API Proxy & CORS Preflight (`src/proxy.ts`)**:
   - Matches `/api/:path*` requests and manages cross-origin access using `getCorsOrigins()`.
   - Enforces strict allowed headers: `Content-Type, Authorization, Accept, X-Asol-Session-Token, X-Asol-Trace-Id`.
   - Returns HTTP 204 for preflight `OPTIONS` requests and binds matching CORS headers.
2. **Server Port Initialization (`src/instrumentation.ts`)**:
   - Executes during Node.js server startup (`NEXT_RUNTIME === 'nodejs'`).
   - Dynamically loads and runs `registerAppServerPorts()` from `src/core/composition/server-ports.ts`, binding all abstract ports before any API route or server service processes requests.
3. **Exact Composition Feature Seams (`COMPOSITION_FEATURE_SEAMS`)**:
   - Microservice composition packages (`*-composition`) are strictly limited to exact file imports registered in `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`.
   - Broad feature barrel imports (`@/features/*`) are rejected to prevent accidental credential or dependency leakage into isolated service deployments.

## Sealed Package Taxonomy

The monorepo contains **42 sealed packages** organized into 5 layers:

1. **Capability Packages (`*-core`, 33 packages)**:
   - Encapsulate domain logic, UI widgets, or infrastructure drivers.
   - Must NOT import `@/` application code (`mayImportApp: false`).
2. **Composition Packages (`*-composition`, 6 packages)**:
   - Wire application features to specific deployment modules (`notifications`, `orders`, `products`, `profiles`, `submain`, `sub2main`).
   - The only packages permitted to import application code (`mayImportApp: true`).
3. **Declarations Package (`account-declarations`, 1 package)**:
   - Pure data describing deployment accounts and endpoints. Zero runtime imports.
4. **Bridge Package (`account-bridge`, 1 package)**:
   - Browser/device runtime logic for cross-account identity, workload routing, and notification grant delivery.
5. **Enforcement Package (`architecture-core`, 1 package)**:
   - AST parser, architecture rules, registry schemas, and `architecture:check` CLI engine.

## Mandatory Architectural Invariants

1. **Declared Doors Only**: All packages expose functionality strictly via `package.json` `exports`. No deep imports (`@asol/pkg/src/...`).
2. **Mandatory Gateways**:
   - Persistence: `@asol/data-core`
   - Media / Storage: `@asol/storage-core`
   - Device & Native: `@asol/native-core`
   - Page Form Writes: `@asol/page-save-core`
   - Push Notifications: `@asol/notifications-core`
   - OTA Updates: `@asol/ota-core`
3. **Single Responsibility Principle (SRP)**: Every source file has exactly one clear reason to change. UI, domain logic, and API calls must not be mixed.
4. **Touch-First Interaction**: Hover styles (`:hover`, `hover:`, `group-hover:`) and pointer cursors (`cursor-pointer`) are forbidden in application source.
5. **Plain Source Ids**: Elements are identified by the plain HTML `id` written in the source. Nothing generates, mints, validates, or catalogues it; a standalone DOM inspector reads it straight off the node.
6. **Overlay Chrome Dismiss Isolation**: Floating tools (DevBadge, SuperAdminUiAttributeInspector, SuperAdminErrorFloatingButton) must carry `data-asol-overlay-chrome` and wrap in `DismissableLayerBranch`.
7. **Default Deny**: Unregistered packages, undeclared vendor SDK imports, or unmapped feature directories fail `npm run architecture:check`.
