# Architecture Contract (Enforced)

Not documentation-only — enforced on every build and CI. Violations fail `npm run architecture:check`, `npm run build`, and PR checks. No per-file waivers.

## Official stack

```
UI → Hooks → Client Services → AsolApiClient → Business API
  → Server Services → Query/Command → Repository → Database Client → SQLite / Turso
```

No shortcut paths. Every feature follows the same layers.

## Import rules (summary)

| Layer | May import | Must never import |
|-------|------------|-------------------|
| UI | Hooks, components | Repository, DB, Drizzle, Server Services |
| Hooks | Client Services | Repository, Database, Drizzle |
| Client Services | AsolApiClient | `fetch`, SQL, Repository |
| AsolApiClient | HTTP transport | Direct DB |
| Business API | Server Services (bootstrap) | Repository, Operations, Client Services |
| Server Services | Query / Command | Repository direct, Drizzle, DB Client |
| Query / Command | Repository | DB Client, Drizzle |
| Repository | Database Client, Drizzle | UI, Hooks, client code |
| Database Client | SQLite, Turso drivers | Layers above |
| Configuration | — | Only place for `process.env` |

**Wiring:** Commands/Queries created in `operations/instances.ts`. API routes import bootstrap server modules only.

## Hard bans

| Rule | Allowed only in |
|------|-----------------|
| `fetch()`, axios, XHR | `asol-http-transport.ts` |
| Raw SQL | Repository, Database Client, Provisioning |
| `drizzle-orm` | Repository, `packages/data-core/src/core/database/**` |
| `@libsql/client`, `better-sqlite3` | Database Client, Provisioning |
| `process.env` | `src/core/config/*` |
| Secrets in client files | Forbidden |
| `server-only` in Client Components | Forbidden |

## Run check

```bash
npm run architecture:check
```

Success = 100% score, all layer checks pass.

## Data-access enforcement

- ESLint rejects `better-sqlite3`, `@libsql/client`, Drizzle, and direct
  IndexedDB usage outside `packages/data-core/src` while code is authored.
- The architecture scanner covers runtime source, database-backed tests,
  maintenance tools, and the generated push worker. Database code under
  `scripts/` is rejected.
- Runtime database construction resolves through the central runtime context
  and is rejected in browser, static-export, Android, and iOS execution.
- Provisioning and maintenance environment variables are isolated under
  `packages/data-core/src/provisioning` and `packages/data-core/src/tooling`.
- There are no per-feature SQL or driver waivers outside the module.

## Where the checks actually run

**There are no GitHub Actions workflows in this repository.** `.github/workflows`
exists but is empty, and
[`16-deployment-targets.md`](16-deployment-targets.md) states the reason:
Actions is intentionally unused. Earlier revisions of this page listed
`ci.yml` and `nextjs.yml`; those files have never existed and the claim is
removed rather than reinstated.

Enforcement is therefore in the npm scripts, which is what Vercel runs on a
push and what a developer runs locally:

| Gate | Command | Notification checks included |
|------|---------|------------------------------|
| Application build | `npm run build` | `architecture:check`, then `test:notifications` |
| Static / mobile bundle | `npm run build:static` | `verify:notifications` (architecture + all notification suites) |
| Repository verification | `npm run verify:all` | `architecture:check` and `test:notifications` as steps |
| Focused notification gate | `npm run verify:notifications` | everything, in ~50 s, with no side effects |

Every one of those exits non-zero on a boundary or behaviour regression, so a
build cannot proceed past a broken notification contract.

`verify:notifications` writes nothing: it reads the working tree, mirrors the
service sources into a temporary directory, and touches no database, no remote,
and no generated artefact. It is safe to run in a loop.

If GitHub Actions is adopted later, the workflow is one job running
`npm run verify:notifications` — no new configuration in this repository is
needed for the checks themselves.

## Source files

| File | Role |
|------|------|
| `packages/architecture-core/src/contracts/contract.ts` | Layer definitions, import matrix |
| `packages/architecture-core/src/contracts/notification-contract.ts` | Notification module boundary, entry points, layer matrix, transport ownership |
| `scripts/architecture-check.ts` | Project scanner |
| `packages/architecture-core/src/checks/notification-contract.ts` | Notification boundary checker |

To change rules, edit the contract file — that is an explicit architectural
decision.
