# Super Admin and Operations Domain

## Purpose

Operational behavior for privileged administration, catalog operations, cloud-account visibility, data health, monitoring, system/live logs, and user impersonation.

These operations run in their own deployment, `asol-control`, not in the application. See [The Control Runtime](./control-runtime.md).

## Read First by Task

- Catalog administration → [Catalog Studio](./catalog-studio.md)
- Where operations actually run, release readiness, and rollback → [The Control Runtime](./control-runtime.md)
- Cloud account topology/visibility → [Cloud Accounts Architecture](./cloud-accounts-architecture.md) and [Super Admin Cloud Accounts](./super-admin-cloud-accounts.md)
- Data cleanup/health → [Data Health Module](./data-health-module.md)
- Notification verification → [Notification Tests](./notification-tests.md)
- Operational status → [Operation Monitor](./operation-monitor.md)
- Logs → [Super Admin Live Logs](./super-admin-live-logs.md)
- Impersonation → [Super Admin User Impersonation](./super-admin-user-impersonation.md)
- How a cloud agent reaches this machine → [Local Agent Connection Guide](./local-agent-connection.md), and what it reaches → [Persistent Local Agent Runtime](./local-agent-runtime.md)
- DOM inspection → standalone super-admin inspector that reads and copies the selected element's plain HTML `id`. A touched internal node without an `id` resolves to its closest identified DOM ancestor. While inspection is active, selection cannot execute the touched control or dismiss the sidebar, dialogs, or menus.

## Safety Boundary

Privileged UI is not an authorization boundary by itself. Server/domain checks, audit/system-log behavior, data ownership, and runtime capability contracts must remain authoritative.

## Change Impact

Operational changes can affect production data, auditability, deployment accounts, observability, and administrative security. Use the context pack to identify server/service/data dependencies and targeted tests before implementation. Destructive database or deployment actions are never implied by documentation changes.
