# Configuration Layer

**Location:** `src/core/config/`

The **only** place allowed to read `process.env` (enforced by Architecture Contract).

| File | Purpose |
|------|---------|
| `runtime-env.ts` | `isDevelopment`, `isDevRuntime()`, `isStaticExportBuild()`, `isProvisioningContext()` |
| `public-env.ts` | `NEXT_PUBLIC_*` values for client bundle |
| `server-env.ts` | Server-only re-export (`import 'server-only'`) |
| `server-env.values.ts` | Turso credentials, CORS — scripts + server |

## Usage

- **Client:** import `publicEnv`, `isDevelopment` from `@/core/config`
- **Server:** import secrets from `server-env.ts` or `server-env.values.ts`
- **Build scripts:** may use `server-env.values.ts` directly

## Rule

No `process.env` in features, components, hooks, or repositories.

See [14-environment-variables.md](./14-environment-variables.md) for the full variable list.
