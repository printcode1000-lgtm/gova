# Architectural Decisions & Rationale (ADRs)

## ADR-0001: Five Global Runtime Targets

- **Decision**: Treat Development, Web (`.next`), Static `out/`, Android (Capacitor), and iOS (Capacitor) as permanent, mandatory targets evaluated on every change.
- **Why**: Production Android and iOS apps consume the static export (`out/`) rather than running a Node server. If server-only features (like same-origin App Router `/api/*` handlers) leak into client bundles, static and mobile platforms break silently.
- **Constraints**: Client code must use `AsolApiClient` with configurable remote API endpoints.

---

## ADR-0002: Zero Cross-Service Backend-to-Backend Calls

- **Decision**: Standalone microservices under `services/*` deploy to separate Vercel accounts and never call each other over the network.
- **Why**: Eliminates distributed transaction failures, network waterfalls, inter-service API key management, and circular network deadlocks.
- **Alternative Rejected**: Internal VPC / private REST microservice mesh.
- **Solution**: The user's browser acts as the connector through client-side routing (`service-bridge`).

---

## ADR-0003: HMAC Grant Architecture for Push Notifications

- **Decision**: Decouple notification decision authority (`gova` main server) from delivery execution (`asol-notifications` service) using tamper-proof HMAC-SHA256 grants.
- **Why**: `gova` owns the database (orders, user UIDs) but does not hold push credentials (FCM service accounts, APNs certificates). `asol-notifications` holds credentials but has no access to user databases.
- **Mechanism**: `gova` issues a signed grant payload; the client browser delivers it to `asol-notifications`, which verifies the HMAC before dispatching push notifications.

---

## ADR-0004: Sealed Package Model & Single Capability Ownership

- **Decision**: Monorepo packages in `packages/*` are strictly sealed with explicit `exports` maps and single capability ownership.
- **Why**: Prevents deep-import spaghetti, untracked dependencies, and accidental leakage of vendor SDKs (e.g. Capacitor, Drizzle, AWS S3) into general application UI code.
- **Enforcement**: Four independent layers: `package.json` exports, ESLint import restrictions, static AST architecture scanner (`architecture:check`), and contract tests.

---

## ADR-0005: Local Verification Gates over CI-Dependent Deployment

- **Decision**: Enforce complete architecture, runtime, and contract checks locally before pushing to `main`. GitHub Actions is strictly docs-focused and path-filtered.
- **Why**: Immediate feedback loop, zero cloud CI queue bottlenecks, and strict local verification before production deployments.
- **Constraint**: `npm run architecture:check` and relevant `test:*-core` must pass before any task is considered complete.

---

## ADR-0006: Strict Touch-First UI Interaction Policy

- **Decision**: Completely ban hover-dependent styles (`hover:`, `group-hover:`, `:hover`) and pointer cursors (`cursor-pointer`) in application presentation code.
- **Why**: Prevents desktop-only interaction paradigms that break or behave unpredictably on mobile touch screens and Capacitor native shells.
