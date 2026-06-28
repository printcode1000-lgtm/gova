# Security Rules

| Rule | Status |
|------|--------|
| No SQL from the client | Enforced — `/api/db` removed |
| No database tokens in the browser | Turso credentials are server-only |
| No Platform API at runtime | `TURSO_API_TOKEN` only in provisioning scripts |
| Business APIs only | Structured JSON in/out |
| CORS per deployment | Via `GOVA_CORS_ORIGINS` |
| Repository is server-only | `import 'server-only'` |
| Secrets in Configuration only | Architecture Contract scan |

## CORS defaults

When `GOVA_CORS_ORIGINS` is unset, dev defaults include localhost and Capacitor shell origins (`capacitor://localhost`, etc.).

## Password handling

Passwords are hashed on the server (SHA-256 in auth commands) — never stored or logged in plain text on the client beyond form state.
