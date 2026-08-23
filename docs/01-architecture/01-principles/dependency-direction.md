# Dependency Direction

## Purpose

Define the allowed direction of dependencies across packages, application layers, and infrastructure.

## Scope

Dependency direction rules. Specific allow/forbid lists are in [03-dependencies/](../03-dependencies/dependency-rules.md).

## Invariants

```text
Application UI/Hooks
  → Client Services
  → AsolApiClient
  → Business API / Server Services
  → Query/Command (operations)
  → Repository (@asol/data-core domain doors)
  → Database Client (@asol/data-core/server internals)
  → FINAL_SIDE_EFFECT (Turso / SQLite)

Capability packages
  → Other @asol/* declared doors only
  → Ports (interfaces), not foreign implementations

Composition packages
  → @asol/* capability doors
  → @/ application modules (only layer with mayImportApp: true)

Capability packages
  MUST NOT → @/ application
  MUST NOT → vendor SDKs not in vendorModules
  MUST NOT → form cycles with other packages
```

## Related Documents

- [Dependency Rules](../03-dependencies/dependency-rules.md)
- [Application Layers](../10-application-layers/README.md)
- [Dependency Inversion](../03-dependencies/dependency-inversion.md)

## Change Impact

Reversing dependency direction requires port introduction, composition update, cycle check, and ADR.
