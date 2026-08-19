# AGENTS.md

Operating notes for agents working in this repository. See `CLAUDE.md`, `GEMINI.md`,
and `docs/` for the full project rules and architecture. Project documentation lives
under `docs/` (English only); this file is only agent/runtime operating context.

## Cursor Cloud specific instructions

Environment is Linux-only. Android/iOS native builds, Firebase push, Turso cloud,
Cloudflare R2, and Vercel deploys are out of scope here — they need provider secrets.

### Toolchain / install
- Node `>=22 <25` (VM has 22.x). The project pins npm `11.19.0`; npm 12 is intentionally
  unsupported (see `docs/00-overview/technologies.md`).
- The committed `package-lock.json` is out of sync with the `packages/*` workspaces, so
  `npm ci` fails ("Missing @asol/*-core from lock file"). Use `npm install` instead.
  The startup update script already runs `npx -y npm@11.19.0 install`, so on a fresh VM
  dependencies are ready — no manual install needed.
- `better-sqlite3` runs from its bundled `prebuilds/linux-x64.node`; no native compile needed.

### Running the app (main product)
- The only service to run for local dev is the root Next.js app: `npm run dev`
  (serves the web UI + all API routes on `http://localhost:3001`). The `services/*`
  folders (notifications/orders/products/profiles) are separate Vercel deployments and
  are NOT needed in dev — the service bridge is disabled under `next dev`, so the main
  app answers every route (see `docs/05-platform-features/service-bridge-module.md`).
- Dev uses local SQLite files (`public/sync_data/sync_sqlite/*.db`) via `better-sqlite3`;
  `NODE_ENV=development` selects the local data source. No external secrets are required
  to boot. Databases are created/migrated on demand on first request.
- Note: `public/sync_data/sync_sqlite/*.db` are tracked in git. Actions that write to the
  DB (e.g. registering a user) modify these files; revert them (`git checkout -- <db>`)
  if you don't intend to commit test data.

### Login / sessions
- `POST /api/auth/register` works with no extra config. `POST /api/auth/login` needs
  `ASOL_SESSION_SIGNING_SECRET` (any non-empty dev value) to sign the session token;
  without it login returns `sessionSigningSecretNotConfigured`. Set it in the dev shell
  when exercising login, e.g. `ASOL_SESSION_SIGNING_SECRET=dev-secret npm run dev`.
- Registration phone must be 11 digits starting with 010/011/012/015.

### Checks
- Lint: `npm run lint`  •  Types: `npm run typecheck` (both pass).
- The aggregate `npm test`/`npm run build` include native mobile validation
  (`ios:push:validate`, android backup/r8) that fails without mobile/Firebase files.
  For dev verification prefer the individual `test:*-core` / `test:*-composition` scripts
  (all pass), which don't need provider secrets.
