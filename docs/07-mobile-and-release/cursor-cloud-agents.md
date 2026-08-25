# Cursor Cloud Agents (gova)

How this repository is prepared for Cursor Cloud Agents.

## Environment

Repo-level config: `.cursor/environment.json`.

| Field | Value | When it runs |
| --- | --- | --- |
| `install` | `npm ci` | During each environment Build (idempotent disk prep) |
| `terminals` | `npm run dev` (name: `dev`) | At agent start, in a shared `tmux` session |
| `ports` | `3001` (web), `3002` (prod) | Exposed for live inspection |

Resolution order (Cursor): repo `.cursor/environment.json` → personal saved environment → team saved environment.

Node/npm must match `package.json` `engines` (`node` `>=22 <25`, `npm` `>=11 <12`).

## Secrets

Add credentials in the [Cloud Agents dashboard Secrets](https://cursor.com/dashboard/cloud-agents) so the VM can talk to Turso, R2, session signing, notification grants, and other runtime services. Do not commit `.env.local`.

### Preferred: restore the portable archive

The repository already commits `config/secret-archive-latest.zip.enc` and its sidecar
recovery key. On a clean Cloud Agent VM the shortest path is one dashboard secret:

| Secret | Purpose |
| --- | --- |
| `ASOL_SECRET_ARCHIVE_PASSWORD` | PKCS#8 passphrase that unwraps the recovery key |

Then either:

```bash
npm run secrets:restore   # writes .env.local, .vercel/project.json, and other ignored secrets
npm run deploy:all
```

or run `npm run deploy:all` alone — preflight calls `ensureReleaseSecretsRestored`, which runs
`secrets:restore` when release tokens are missing and `ASOL_SECRET_ARCHIVE_PASSWORD` is set.

Without that passphrase (and without a full set of Vercel/Turso/R2 env vars), `deploy:all` stops
at credential checks: the archive cannot be opened and no `.env.local` exists.

### Minimal secrets for local Web Push only

For Web Push on `http://localhost:3001`, the dashboard (or `.env.local`) needs at least:

- `ASOL_SESSION_SIGNING_SECRET` or `ASOL_NOTIFICATION_GRANT_SECRET` — signs notification grants on the main app
- `WEB_PUSH_VAPID_PRIVATE_KEY` — signs outbound Web Push from the development fan-out route

Leave `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` empty in development unless you deliberately want the browser to post grants to the deployed notifications service instead of the local SQLite-backed fan-out route.

Verify the whole chain with `npm run notifications:check:local`; see [the bridge module's preflight](../05-platform-features/notification-bridge-module.md#preflight).

## Starting a cloud run

1. Commit and push any work the agent must see (Move to Cloud does not send local dirty files).
2. Ensure GitHub (or other SCM) is connected with read/write access to this repo.
3. In Cursor Desktop: **Move to Cloud**, or choose **Cloud** under the agent input; or start from [cursor.com/agents](https://cursor.com/agents).
4. Confirm the environment has a successful active Build; guided setup lives under [Environments](https://cursor.com/dashboard/cloud-agents#environments).

## Live follow-up

- Shared terminal shows `npm run dev` and other agent shell work.
- Open the run on [cursor.com/agents](https://cursor.com/agents); hover the repo name to see which environment/Build was used.
- Optional: remote desktop / artifacts for human verification on the agent VM.

## Related

- Project-wide agent rules: `AGENTS.md`
- Cursor docs: [Cloud Agents](https://cursor.com/docs/cloud-agent.md), [Setup](https://cursor.com/docs/cloud-agent/setup.md)
