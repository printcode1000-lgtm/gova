# Security Rules

## Purpose

Preserved operational and architectural detail, relocated here during the 2026-08 architecture reconstruction. Agents use this for implementation guidance.

## Scope

See sections below. Architectural relationships defer to [docs/01-architecture/README.md](../README.md) where applicable.

---

| Rule | Status |
|------|--------|
| No SQL from the client | Enforced — `/api/db` removed |
| No database tokens in the browser | Turso credentials are server-only |
| No Platform API at runtime | `TURSO_API_TOKEN` only in provisioning scripts |
| Business APIs only | Structured JSON in/out |
| CORS in one package | Enforced — only `@asol/cors` may write an `Access-Control-*` header |
| Allowed origins per deployment | Via `ASOL_CORS_ORIGINS` |
| Repository is server-only | `import 'server-only'` |
| Secrets in Configuration only | Architecture Contract scan |

## CORS

Every CORS decision in the repository is made by [`@asol/cors`](../../05-platform-features/sealed-packages/cors-module.md). `npm run architecture:check` fails on any `Access-Control-*` header name written outside `packages/cors/` (comment lines and tests excepted), so a route, proxy, or config table states a policy and asks the package for the headers.

The invariants that policy enforces:

- **No wildcard or reflected origin with credentials.** `createCorsPolicy` throws `corsCredentialsWithUnverifiedOrigin` rather than construct one. No ASOL surface enables credentials — the cross-origin contract is a signed `X-Asol-Session-Token` header or a signed grant in the body, never a cookie — which is what makes echoing an origin safe on the service deployments.
- **Exact origin comparison only.** `https://app.example.evil.tld` is not `https://app.example`.
- **A disallowed origin gets no allow-origin header**, never one naming someone else.
- **`Vary: Origin` whenever the answer depends on the origin**, refusals included.
- **Preflight and real response are one decision**, built from the same policy.

## Allowed origins

`ASOL_CORS_ORIGINS` is a comma-separated origin list, read only through `corsOriginsFromEnv`. It replaces any fallback entirely rather than merging with one, so a deployment must list **every** required origin, native shell origins included.

When it is unset, the fallback is the caller's own and they differ deliberately: the application's `/api/*` boundary allows **nothing** — an unconfigured deployment refuses cross-origin reads rather than opening them — while the R2 and OTA bucket policies allow any origin, because a bucket with no CORS rules cannot be reached by a browser at all and the bytes are public either way.

The localhost and Capacitor/Ionic shell origins are exported as `DEVELOPMENT_ORIGINS` for a caller that wants them as its fallback. No production surface uses them: they are not an implicit default of the API boundary.

## Password handling

Passwords are hashed on the server (SHA-256 in auth commands) — never stored or logged in plain text on the client beyond form state.
