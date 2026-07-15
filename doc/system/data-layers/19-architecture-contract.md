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
| `drizzle-orm` | Repository, `src/core/database/**` |
| `@libsql/client`, `better-sqlite3` | Database Client, Provisioning |
| `process.env` | `src/core/config/*` |
| Secrets in client files | Forbidden |
| `server-only` in Client Components | Forbidden |

## Run check

```bash
npm run architecture:check
```

Success = 100% score, all layer checks pass.

## CI

| Workflow | When | Checks |
|----------|------|--------|
| `.github/workflows/ci.yml` | PR / push to `main` | `architecture:check`, `typecheck`, `lint` |
| `.github/workflows/nextjs.yml` | Pages deploy | `architecture:check` before `build:static` |
| `npm run build` | Local / Vercel | `architecture:check` before Next.js build |

## Source files

| File | Role |
|------|------|
| `src/core/architecture/contract.ts` | Layer definitions, import matrix |
| `scripts/architecture-check.ts` | Project scanner |

To change rules, edit `contract.ts` — that is an explicit architectural decision.
