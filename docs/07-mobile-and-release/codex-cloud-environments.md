# Codex Cloud Environments (gova)

How to configure Codex Cloud for this repository.

## Repository

- GitHub repository: `printcode1000-lgtm/gova`
- Default branch: `main`
- Runtime: Node `>=22 <25`, npm `>=11 <12`

Codex Cloud checks out the selected branch or commit SHA, then runs the
environment setup script before the agent starts work.

## Setup Script

Use this setup script in the Codex environment:

```bash
npm install -g npm@11
npm ci
```

Do not run `npm run dev`, `npm run build`, `npm run build:static`, deployment,
OTA, or database reset scripts in the setup script. Those belong to individual
agent tasks or explicit release operations.

## Recommended Verification

For routine code tasks, ask the Codex Cloud agent to run:

```bash
npm run typecheck
npm run lint
npm run architecture:check
```

For final verification when the change warrants it, ask it to run:

```bash
npm run build
```

Do not use browser or preview verification for this repo. Follow `AGENTS.md`
and verify with terminal checks, tests, builds, and HTTP probes.

## Secrets

Add required secrets in Codex environment settings, not in the repository.
Mirror the values needed from local `.env.local`, including Turso, R2, session
signing, notification grants, and related runtime credentials.

Codex setup scripts can access secrets during setup. Treat secrets as setup-only
unless a task explicitly requires runtime environment variables.

## Internet Access

Keep setup internet access enabled so `npm ci` can install dependencies.
Agent internet access can stay disabled by default unless a task needs external
network calls.

## References

- Project agent rules: `AGENTS.md`
- Official OpenAI documentation: https://learn.chatgpt.com/docs/environments/cloud-environment
- Codex Cloud quickstart: https://learn.chatgpt.com/docs/cloud
