# `@asol/env-core`

## Mission

How an environment variable is read — not which ones exist.

Key ownership does not move: `@asol/account-declarations` owns the per-account deployment keys, and
each capability package reads the credentials it holds. What was being re-derived everywhere is
smaller and duller: whether an empty string counts as absent, whether values are trimmed, what a
missing required key throws, and which of two legacy spellings wins.

## Doors

| Door | Import | Safe for | Contents |
| :--- | :--- | :--- | :--- |
| `.` | `@asol/env-core` | Anything | `readOptionalEnv`, `readEnv`, `requireEnv`, `firstEnv`, `hasEnv`, `readBooleanEnv`, `readListEnv` |
| `./files` | `@asol/env-core/files` | Node only | `readEnvFiles` — `.env.local` then `.env`, for tooling that runs outside Next.js |
| `./process` | `@asol/env-core/process` | Node only | `loadReleaseToolEnvironment` / `resolveReleaseToolEnvironmentSources` — fills `process.env` for release tools |

`./process` is Node-only. `loadReleaseToolEnvironment` applies this precedence
and **never logs values**:

1. Existing process environment
2. `.env.local` fills missing keys
3. `.env` fills keys still missing
4. `fastlane/.env` fills keys still missing

Empty declarations are unconfigured and do not mask a later non-empty value.

## The rule

**Blank is absent.** A key set to `""` or `"   "` is unconfigured, not configured-to-empty — which
is what a partially provisioned deployment actually looks like. Every helper follows it, and every
value is trimmed.

Two deliberate narrownesses:

- `readBooleanEnv` accepts only `1` and `true`. "Any non-empty string is true" would make
  `VERCEL=0` enable a Vercel branch.
- `readEnvFiles` returns values **raw** — no trimming, no quote stripping. A Turso token with
  meaningful trailing characters must not be silently altered on the way to a database, which is
  why the file reader deliberately does not reuse the trimming rule above.

`env` is a parameter with a `process.env` default throughout, so a caller can pass a parsed `.env`
file or a test fixture without touching the real environment.
