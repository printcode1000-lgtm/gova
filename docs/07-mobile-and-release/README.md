# Mobile and Release Domain

## Purpose

Native application integration, Capacitor, Android/iOS build behavior, OTA, release/versioning, deployment targets, release environment, secrets procedures, and cloud-agent execution environments.

## Read First by Task

- Native/Capacitor → `capacitor/` plus the owning `@asol/native-core` architecture entry.
- Deployment topology → [Deployment Targets](./deployment-targets.md).
- Release/environment handling → [Release and Secrets](./release-and-secrets.md).
- Repository commands → [Scripts and Workflows](./scripts-and-workflows.md).
- Cloud workspaces → [Cloud Environments](./cloud-environments.md), [Codex Cloud Environments](./codex-cloud-environments.md), [Cursor Cloud Agents](./cursor-cloud-agents.md).

## High-Risk Rules

Deployment, OTA publishing, store release, environment provisioning, schema operations, and signing changes have production impact. Documentation describes how they work; it does not authorize running them. Execute such actions only when explicitly requested and after the relevant preflight gates.

Native dependency ownership remains sealed behind architecture-defined packages. A dependency upgrade must not leak vendor APIs throughout application code.

## Change Impact

Release changes can affect the web build, static Capacitor bundle, Android/iOS native projects, service deployments, environment requirements, version policy, OTA behavior, and store artifacts. Run a context pack for the exact script/config/package before editing.
