# Architecture Glossary

## Purpose

Stable vocabulary for agent retrieval. Use these terms consistently across all architecture documents.

## Scope

Architectural concepts used in `docs/01-architecture/`. Not a general software glossary.

| Term | Definition |
|---|---|
| **Capability** | A coherent domain responsibility with one authoritative owner (e.g. product mutation rules, object storage access). |
| **Owner Package** | The sealed `@asol/*` package that OWNS a capability's semantics and public gateway. |
| **Public Gateway** | The declared `package.json` export path(s) through which consumers MUST interact with a capability. |
| **Port** | A minimal interface a capability REQUIRES; implemented by an adapter at composition time. |
| **Contract** | Shared types or narrow API surface between packages; MUST expose least authority. |
| **Adapter** | Application or composition code that IMPLEMENTS a port using authorized infrastructure. |
| **Composition Root** | The single place where ports are wired to implementations (`src/core/composition/` or `*-composition` packages). |
| **Mandatory Gateway** | A capability whose bypass is forbidden by static enforcement (e.g. `@asol/page-save-core`). |
| **Sealed Package** | An independent `packages/<name>` module with explicit `exports`, registry entry, and `test:*-core` gate. |
| **Capability Closure** | State where one owner, one gateway, no bypass paths, and static enforcement all hold. Status: CLOSED. |
| **Infrastructure Owner** | The package registered in `vendorModules` as the sole direct consumer of a vendor SDK. |
| **Final Side Effect** | The real external mutation at the end of an execution path (Turso write, R2 upload, Capacitor API call). |
| **Runtime Boundary** | Separation between browser-safe, server-only, Node tooling, and native execution contexts. |
| **Default Deny** | New packages/directories receive no implicit infrastructure authority until registered and enforced. |

## Related Documents

- [Architecture Principles](./01-principles/architecture-principles.md)
- [Capability Map](./08-reference/capability-map.md)
