# Cloud Environments & Remote Workspaces (gova)

This repository is pre-configured to run seamlessly across all major cloud development and cloud agent environments.

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

## 3. Cursor Cloud Agents

Repo-level config: [`.cursor/environment.json`](file:///.cursor/environment.json).
See [`cursor-cloud-agents.md`](file:///docs/07-mobile-and-release/cursor-cloud-agents.md) for secrets and runtime details.

## 4. Codex Cloud

See [`codex-cloud-environments.md`](file:///docs/07-mobile-and-release/codex-cloud-environments.md).
