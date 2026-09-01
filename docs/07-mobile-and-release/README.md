# Mobile and Release Domain

## Purpose

Native application integration, Capacitor, Android/iOS build behavior, static `out/`, OTA, release/versioning, deployment targets, release environment, secrets procedures, and cloud-agent execution environments.

## Permanent Cross-Runtime Rule

This repository is not a web project with optional native wrappers. Every change must consider **Development, Web, Static `out/`, Android, and iOS**. Production Android and iOS consume the static `out/` web payload through Capacitor and then add platform-specific native behavior. Server-capable Web uses `.next`; static/native production does not bundle App Router API handlers.

Read [Project Runtime Contract](../09-agent-knowledge/runtime-contract.md) before any release, build, runtime, native, API-base, version, environment, or shared-client change.

## Read First by Task

- Native/Capacitor → `capacitor/`, [Project Runtime Contract](../09-agent-knowledge/runtime-contract.md), plus the owning `@asol/native-core` architecture entry.
- Static bundle / OTA → `@asol/ota-core`, `scripts/build-static.ts`, `next.config.ts`, and the runtime contract.
- Deployment topology → [Deployment Targets](./deployment-targets.md).
- Which command publishes what, and in which order → [Release Commands](./release-commands.md).
- Release/environment handling → [Release and Secrets](./release-and-secrets.md).
- Repository commands → [Scripts and Workflows](./scripts-and-workflows.md).
- Local agent execution / recovery runner → [Local Agent Runner Pool](./local-agent-runner-pool.md).
- Resuming, retrying or speeding up `deploy:all` → [deploy:all Resume, Checkpoints and Parallel Preflight](./deploy-all-resume-and-checkpoints.md).
- GitHub Actions / `main` push policy → [GitHub CI Policy](./github-ci-policy.md).
- Cloud workspaces → [Cloud Environments](./cloud-environments.md).

## Artifact Topology

```text
npm run build        -> .next -> Web
npm run build:static -> out/  -> Static preview + Android + iOS
```

`capacitor.config.ts` owns `webDir: "out"`. Android/iOS native projects do not replace the shared payload; they host it and provide native capabilities. A regression in static client behavior is therefore normally relevant to both native platforms.

## High-Risk Rules

Deployment, OTA publishing, store release, environment provisioning, schema operations, signing changes, and commands that overwrite release artifacts have production impact. Documentation describes how they work; it does not authorize running them. Execute such actions only when explicitly requested and after relevant preflight gates.

Do not run `npm run build:static` merely to “check” a change: it overwrites the release `out/` bundle.

Native dependency ownership remains sealed behind architecture-defined packages. A dependency upgrade must not leak vendor APIs throughout application code.

## Static API Boundary

Static `out/` contains no App Router API handlers. Android/iOS production clients therefore depend on the configured remote API origin for server behavior. A feature that only works because development/web can use same-origin `/api/*` is incomplete unless static/native clients have a valid remote boundary.

## Change Impact

Release/shared-client changes can affect the server Web build, static Capacitor bundle, Android/iOS native projects, service deployments, environment requirements, version policy, OTA behavior, push/native permissions, and store artifacts. Run a Context Pack for the exact script/config/package before editing; the pack always exposes all five application surfaces and direct graph evidence for the target.
