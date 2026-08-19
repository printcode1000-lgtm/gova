## Pull Request Checklist

Twenty-one sealed packages are held to [the eight module isolation rules](../docs/01-architecture/module-isolation-rules.md).
Tick what applies; delete the sections a change does not touch.

### 1. Package seal (rules 2, 5, 7 — all packages)
- [ ] No deep import into any package. Every consumer goes through a door declared in that
      package's `exports` (`@asol/data-core/<door>`, `@asol/orders-core`, `@asol/native-core`, …).
- [ ] No relative path reaching into `packages/` — a relative path never consults `exports`, which
      is how nineteen imports once made a seal decorative while every declared door looked correct.
- [ ] No `"./*"` wildcard door, and no `"@asol/<name>/*"` path in `tsconfig.json`.
- [ ] A new door is declared deliberately in three places: `exports`, `tsconfig.json` paths, and
      the package's own contract test.
- [ ] No package grew a new application edge. If one is unavoidable, it is added to that package's
      budget with the reason it is layering rather than a violation.

### 2. Data (`@asol/data-core`)
- [ ] `drizzle-orm`, `better-sqlite3`, and `@libsql/client` are imported only inside
      `packages/data-core/src/core/database/`, which has no door.
- [ ] The root door does not re-export a domain — a barrel mirrors every schema into any
      deployment that imports it.
- [ ] Schema changes are in a migration (or the data-health DDL module), and the shard map,
      the table→shard lookup, and the migrations still agree. `npm run test:data-core` covers this.
- [ ] Nothing new depends on a live Turso database at build or test time.
      `db:schema:sync:release` in `deploy:all` is the only step that talks to the cloud.

### 3. Orders (`@asol/orders-core`)
- [ ] Still one door, still zero `@/` and zero `@asol/*` imports.
- [ ] Still free of node builtins, drivers, React and Next — it runs in the browser, on the main
      app, and inside the orders deployment.
- [ ] The identity port still fails closed, and all three registration points are intact.

### 4. Native & mobile (`@asol/native-core`)
- [ ] No direct import of `@capacitor/*`, `@capawesome/*`, or `@capgo/*` outside
      `packages/native-core/src/adapters/`.
- [ ] No Capacitor type leaked into the public API; public functions return the Result union.
- [ ] **Pre-WebView Android channels**: `AsolNotificationChannels.ensureCreated(this)` still runs
      in native `onCreate` before the WebView loads.
- [ ] **Frozen channel IDs** at `_v4`; notification sound still addressed as `custom_notification`.
- [ ] iOS `AppDelegate.swift` still forwards token registrations.

### 5. Deployments
- [ ] `npm run services:sync` then `npm run services:verify` — every module edge resolves inside
      each upload. A specifier the walker cannot see still builds remotely and fails on the first
      request.
- [ ] `npm run services:build` — all four services build the way Vercel builds them.
- [ ] No account's mirror gained a capability it holds no credential for.

### 6. Verification suite
- [ ] `npm run lint` — 0 errors.
- [ ] `npm run typecheck` — 0 errors.
- [ ] `npm run architecture:check` passes.
- [ ] `npm test` passes, and any new `test:*-core` script is in the `build`, `build:static`, and
      `test` chains **and** in the `verify` workflow. A test that gates nothing does not satisfy
      rule 3, and `npm run ci:coverage` fails when one is missing from CI.
- [ ] Documentation under `docs/` updated in the same change when behaviour, APIs, data contracts,
      architecture, configuration, or operational steps changed.
