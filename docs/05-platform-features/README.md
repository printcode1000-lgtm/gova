# Platform Features Domain

## Purpose

Cross-cutting application capabilities such as authentication, notifications, maps, network state, favorites/follow, password recovery, page save, and independently deployed service behavior.

## Start with Ownership

Before reading a large feature document, resolve the exact capability owner:

```bash
npx tsx scripts/docs/context.ts <feature-or-path>
```

Then consult `docs/01-architecture/08-reference/capability-map.md` for the owning `@asol/*` package and public doors.

## High-Value Documents

- [Auth Core Module](./auth-core-module.md)
- [Notification System](./notification-system.md), [Notification Bridge](./notification-bridge-module.md), and service-specific notification docs
- [Map Core Module](./map-core-module.md)
- [Network Status System](./network-status-system.md)
- [Page Save System](./page-save-system.md)
- [Favorites System](./favorites-system.md) and [Follow System](./follow-system.md)
- [Password Recovery System](./password-recovery-system.md)

## Change Impact

Platform capabilities often span package contracts, application composition, browser/server/native runtimes, persistence, deployment services, and security-sensitive boundaries. Treat a change as cross-runtime until the context graph proves otherwise.

Generated catalogs under `docs/09-agent-knowledge/generated/` provide exhaustive discovery; hand-written feature documents should explain intent and flow rather than duplicate live inventories.
