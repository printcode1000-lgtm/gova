# Capability Ownership

## Purpose

Define what "owning a capability" means and how agents determine the canonical owner.

## Scope

Ownership semantics for sealed `@asol/*` packages. The authoritative ownership table is [capability-map.md](../08-reference/capability-map.md) — this document explains the model.

## Responsibilities

An owner package MUST:

- OWNS → authoritative domain logic and validation for its capability
- PROVIDES → public gateway(s) via declared `exports`
- REQUIRES → ports for infrastructure it does not own
- VALIDATED_BY → `test:*-core` gate in the build chain

## Non-Responsibilities

An owner package MUST NOT:

- OWN → unrelated domain capabilities (capability creep)
- EXPOSE → raw vendor SDKs to consumers
- IMPORT → `@/` application paths (except composition layer)

## How to Verify Ownership

Trace from caller to FINAL_SIDE_EFFECT:

1. Who validates input authoritatively?
2. Who exposes the public gateway?
3. Who reaches infrastructure?
4. Who is registered in `capability-registry.ts`?

If these disagree, the registry and enforcement are the architectural source of truth — fix code or update registry via ADR.

## Source Map

- `packages/architecture-core/src/registry/capability-registry.ts`
- `packages/architecture-core/src/checks/capability-ownership-contract.ts`

## Related Documents

- [Capability Map](../08-reference/capability-map.md)
- [Capability Closure](../05-capability-enforcement/capability-closure.md)

## Change Impact

Ownership transfer requires: registry, capability-map, composition rewiring, ADR, and enforcement test updates.
