# Capability Closure

## Purpose

Define **capability closure** — the state where a capability has one owner, one gateway, no bypass paths, and static enforcement — and how to verify it.

## Scope

Closure criteria for all capabilities in [capability-map.md](../08-reference/capability-map.md). Status field in capability map entries: **CLOSED**.

## Closure checklist

A capability is CLOSED when all hold:

| # | Criterion | Verification |
|---|---|---|
| 1 | Single owner in `CAPABILITY_PACKAGES` | Registry ↔ disk parity |
| 2 | Declared public gateway(s) in `exports` | Package contract test |
| 3 | No vendor SDK outside owner | `checkVendorOwnershipContract` |
| 4 | No deep import bypass | ESLint + `checkPackageSealContract` |
| 5 | No alternate path in application | Architecture scan + feature tests |
| 6 | Build gate covers owner | `test:*-core` in `build` chain |

## Composition closure (per account)

Service compositions additionally assert **task closure**:

- Runtime object exposes only tasks the account credentials support
- Forbidden tasks are absent (`assert(!('crypto' in runtime))`), not merely unused
- Cross-account env keys do not leak via declaration barrel imports

Tests live in each `packages/*-composition/src/tests/`.

## Opening a new capability

Follow [package-creation-rules.md](../02-packages/package-creation-rules.md). Capability remains OPEN until registry entry, exports, tests, and docs exist.

## Re-opened capabilities (historical)

Consolidation ADRs document capabilities moved from scattered `src/` into sealed packages (format, signed-token, observability, OTA, etc.). Closure followed registry + scan updates in the same change set.

## Source Map

- Ownership: [capability-map.md](../08-reference/capability-map.md)
- Ownership contract: `checks/capability-ownership-contract.ts`
- Composition tests: `packages/*-composition/src/tests/`

## Related Documents

- [Mandatory Gateways](./mandatory-gateways.md)
- [Bypass Prevention](./bypass-prevention.md)
- [Package Creation Rules](../02-packages/package-creation-rules.md)

## Change Impact

Splitting a closed capability requires new owner registration, migration, and closure tests before removing the old path.

## Invariants

1. Every registry entry maps to a CLOSED capability in capability-map.
2. OPEN capabilities MUST NOT reach production without owner and gates.
3. Composition closure tests MUST pass in `test:compositions`.
