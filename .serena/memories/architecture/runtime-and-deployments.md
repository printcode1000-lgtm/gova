# Runtime Surfaces & Deployment Topology

## Five Mandatory Application Surfaces
1. **Development**: `next dev --turbo --port 3001` + Capacitor live reload.
2. **Web**: Full `.next` Node.js server runtime on Vercel (`gova`).
3. **Static `out/`**: Client static export (`npm run build:static`), zero App Router `/api/*` handlers bundled.
4. **Android**: Capacitor Android shell hosting `out/` + Android native plugins + R8/backup policies.
5. **iOS**: Capacitor iOS shell hosting `out/` + iOS native plugins + SPM dependencies.

## Multi-Account Deployment Architecture
- **6 Microservices under `services/`**:
  - `asol-notifications` (bs.bid.story@gmail.com / Turso hesham102)
  - `asol-products` (gnagnahesham@gmail.com / Turso hesham103)
  - `asol-orders` (tenderx10@gmail.com / Turso hesham104)
  - `asol-profiles` (hesham10125@gmail.com / Turso hesham105)
  - `asol-submain` (groupstenderximages@gmail.com)
  - `asol-sub2main` (tenderx.engineer100@gmail.com)
  - Root `gova` app (print.code.1000@gmail.com / Turso hesham101)
- **Zero Cross-Service Backend Calls**: Services do NOT call each other.
- **Client-Side Bridges**:
  - `notification-bridge`: Browser carries HMAC-signed delivery grants from `gova` to `asol-notifications`.
  - `service-bridge`: Browser routes read requests directly to specialized service URLs (`asol-products`, `asol-orders`, `asol-profiles`) while writes stay on `gova`.
- **Source Mirroring**: `services/*/` mirror needed code from `src/` via sync scripts (e.g. `npm run services:sync`).
