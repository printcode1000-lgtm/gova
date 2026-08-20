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

- Project agent rules: `AGENTS.md` (§ Cursor Cloud specific instructions)
- Cursor docs: [Cloud Agents](https://cursor.com/docs/cloud-agent.md), [Setup](https://cursor.com/docs/cloud-agent/setup.md)
