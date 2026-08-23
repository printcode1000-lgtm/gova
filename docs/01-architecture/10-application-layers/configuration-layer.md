# Configuration Layer

## Purpose

Preserved operational and architectural detail from `docs/01-architecture-backup/`. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../README.md) where applicable.

---

**Location:** `src/core/config/`

The **only** place allowed to read `process.env` (enforced by Architecture Contract).

| File | Purpose |
|------|---------|
| `runtime-context.ts` | Shared runtime model: deployment, platform, data source, and capabilities |
| `runtime-context.server.ts` | Server and build runtime resolver (`getServerRuntimeContext()`) |
| `runtime-context.client.ts` | Browser and Capacitor runtime resolver (`getClientRuntimeContext()`) |
| `public-env.ts` | `NEXT_PUBLIC_*` values for client bundle |
| `server-env.ts` | Server-only re-export (`import 'server-only'`) |
| `server-env.values.ts` | Turso credentials, CORS — scripts + server |

## Usage

- **Client:** import `getClientRuntimeContext()` for platform and capability decisions; use `publicEnv` for public build values.
- **Server:** import `getServerRuntimeContext()` for runtime decisions and `server-env.ts` or `server-env.values.ts` for secrets.
- **Build scripts:** may use `server-env.values.ts` directly

## Rule

No `process.env` in features, components, hooks, or repositories.

See [environment-variables.md](../../02-data-and-storage/environment-variables.md) for the full variable list.
See [runtime-context.md](../06-runtime-boundaries/runtime-context.md) for the environment model and usage rules.
