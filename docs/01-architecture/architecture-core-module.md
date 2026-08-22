# `@asol/architecture-core`

## Mission

The architecture contract and the scan that enforces it, in one package.

The rules lived in `src/core/architecture/`, the enforcement in `scripts/architecture-check/`, and
the enforcement reached across with `../../src/core/architecture/contract`. The tooling that
enforces rule 5 was the clearest example of what rule 5 forbids.

## Door

| Door | Import | Contents |
| :--- | :--- | :--- |
| `.` | `@asol/architecture-core` | The contract (layers, allowlists, patterns) and `runArchitectureCheck()` |

## Shape

```text
packages/architecture-core/src/
  registry/     capability ownership inventory — one owner per package
  contracts/    the rules, as data      — layer classification, allowlists, forbidden patterns
  checks/       the scanners            — one file per contract it enforces
  runner.ts     the whole scan          — walks src/, packages/, scripts/, services/
```

See also [repository-architecture-enforcement.md](./repository-architecture-enforcement.md).

`scripts/architecture-check.ts` is a CLI:

```ts
process.exit(runArchitectureCheck({ preflight: [ /* storage profiles, category data */ ] }));
```

The two preflight validations stay in the CLI because they need the application's own category data
and storage profile file. A package that reached for either would be doing exactly what it exists
to forbid.

## Self-exemptions, and their limits

Two, both narrow and both documented in the source:

- `checks/` is skipped by the touch-interaction scan, because that file *states* the forbidden
  patterns and scanning it reports the rule text as a violation. Scoped to `checks/` only —
  everything else in the package obeys the policy like any other module.
- `contracts/` is skipped by the package-seal scan, for the same reason.

## Two rot cases found while moving it

- **A dead check.** `native-core-contract.ts` had top-level execution, an undeclared `glob`
  dependency, and no caller. It would have flagged the declared `@asol/native-core/scripts/...`
  door as a violation had anything run it. Deleted; the live check in `checks/architecture-types.ts`
  covers Capacitor imports, and the package seal covers sub-path imports.
- **A stale allowlist entry.** `ALLOWED_PROCESS_ENV_FILES` named
  `packages/data-core/src/domains/marketplace-orders/db/config.ts`, deleted long ago. The package's
  contract test now reads every allowlisted file and fails when one no longer exists — an exemption
  must not outlive the reason for it.

The dead-rule self-check that reads the contract file used to begin `if (!existsSync(path)) return`.
That is the empty-guard pattern this repository has paid for three times; it now throws.
