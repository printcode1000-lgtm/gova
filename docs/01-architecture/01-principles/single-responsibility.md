# Single Responsibility

## Purpose

Document the SRP rule for source files, packages, and architecture documents.

## Scope

Applies to every file under `src/`, `packages/`, `scripts/`, `services/`, and `docs/01-architecture/`.

## Invariants

- Every source file MUST have one clear job and one primary reason to change.
- When a second unrelated concern appears, the file MUST be split.
- Barrel/index files MAY re-export only; they MUST NOT hold implementation logic.
- Every architecture document MUST describe one coherent architectural subject.

## Current Implementation

Enforced by:

- Code review convention (AGENTS.md §3a)
- Module isolation rule 8 in [module-isolation-rules.md](../../01-architecture/02-packages/module-isolation-rules.md)
- Historical SRP splits recorded in [ADR-0003](../09-decisions/ADR-0003-srp-file-splits-2026-08.md)

## Forbidden Bypasses

MUST NOT combine in one file: UI + API client + domain logic + unrelated helpers.

## Related Documents

- [Module Isolation Rules](../02-packages/module-isolation-rules.md)
- [Package Creation Rules](../02-packages/package-creation-rules.md)

## Change Impact

SRP splits may require new files, updated imports, and documentation cross-links.
