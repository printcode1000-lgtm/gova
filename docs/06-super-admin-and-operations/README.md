# Super Admin and Operations Domain

## Purpose

Operational behavior for privileged administration, catalog operations, cloud-account visibility, data health, monitoring, system/live logs, and user impersonation.

## Read First by Task

- Catalog administration → [Catalog Studio](./catalog-studio.md)
- Cloud account topology/visibility → [Cloud Accounts Architecture](./cloud-accounts-architecture.md) and [Super Admin Cloud Accounts](./super-admin-cloud-accounts.md)
- Data cleanup/health → [Data Health Module](./data-health-module.md)
- Notification verification → [Notification Tests](./notification-tests.md)
- Operational status → [Operation Monitor](./operation-monitor.md)
- Logs → [Super Admin Live Logs](./super-admin-live-logs.md)
- Impersonation → [Super Admin User Impersonation](./super-admin-user-impersonation.md)
- Real-user interaction simulation → [User Simulation and E2E](./user-simulation-and-e2e.md)

## Safety Boundary

Privileged UI is not an authorization boundary by itself. Server/domain checks, audit/system-log behavior, data ownership, and runtime capability contracts must remain authoritative.

## Change Impact

Operational changes can affect production data, auditability, deployment accounts, observability, and administrative security. Use the context pack to identify server/service/data dependencies and targeted tests before implementation. Destructive database or deployment actions are never implied by documentation changes.
