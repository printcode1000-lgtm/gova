# Cloud Environments & Remote Workspaces (gova)

This repository supports cloud development and remote workspaces through project-wide, provider-independent rules.

## 1. GitHub Codespaces & Dev Containers

The repository includes [`.devcontainer/devcontainer.json`](file:///.devcontainer/devcontainer.json):

- **Base Image**: `mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm` (Node 22)
- **Lifecycle Hook (`postCreateCommand`)**: Installs `npm@11` and executes `npm ci`
- **Port Forwarding**:
  - `3001`: Dev server (`npm run dev`)
  - `3002`: Production server (`npm start`)
  - `5500`: Static preview (`npm run preview:static`)
- **Direct Launch**: Open via [GitHub Codespaces](https://github.com/codespaces/new?repo=printcode1000-lgtm/gova&ref=main)

## 2. Dedicated Cloud VMs / VPS (Linux)

To bootstrap on an Ubuntu/Debian cloud server:

```bash
# 1. Run the cloud bootstrap script
bash scripts/cloud-setup.sh

# 2. Run architecture checks & verification
npm run architecture:check
```

## 3. Remote Workspace Baseline

All remote workspaces use the same repository requirements:

- Node `>=22 <25` and npm `>=11 <12`.
- `npm ci` for dependency installation.
- Runtime secrets supplied through the workspace secret store, never committed files.
- Project-wide instructions from the root instruction surfaces and task context from `scripts/docs/context.ts`.
- Non-visual verification through tests, type checks, lint, architecture checks, runtime checks, and builds when required.
