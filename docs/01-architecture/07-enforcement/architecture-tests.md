# Architecture Tests

## Purpose

Map architecture enforcement to executable tests beyond the scan — contract tests, composition tests, and integration gates.

## Scope

Tests that gate `build`, `build:static`, and `npm test`. Not an exhaustive test catalog.

## Test categories

| Category | Command pattern | Proves |
|---|---|---|
| Architecture scan | `npm run architecture:check` | Repository-wide rules |
| Package contract | `npm run test:<package>-core` | Export surface, zero forbidden edges |
| Architecture package | `npm run test:architecture-core` | Contract data matches checks |
| Compositions | `npm run test:compositions` | Per-account runtime closure |
| Ports registry | part of composition/app tests | All seams registered |
| Page-save | `npm run test:page-save-core` | Write surface allowlist |
| Notifications | `npm run test:notifications` | Module boundary + flow |
| Import without composition | `npm run test:import-without-composition` | App doesn't reach compositions |
| System logs | `npm run test:system-logs-core` | Capture contract |
| Runtime context | `npm run test:runtime-context` | DB policy per context |

## Build gate inclusion

`npm run build` runs `architecture:check` then every `test:*-core` for sealed packages (long chain in root `package.json`). A package test that exists but is omitted from `build` does **not** satisfy module isolation rule 3.

Compositions: collective `test:compositions` — no per-composition script.

## Contract test location

Each package:

```text
packages/<name>/src/tests/index.test.ts
```

Run via root script `test:<name-with-hyphens>`.

## Architecture-core self-test

`packages/architecture-core/src/tests/index.test.ts` ensures:

- Registry entries match disk
- Contract files reference live check functions
- Dead rules stay removed

## Agent workflow

After package change:

```bash
npm run test:<your-package>-core
npm run architecture:check
```

Before claiming done on architectural change:

```bash
npm run typecheck && npm run lint && npm run architecture:check
```

## Source Map

- Root scripts: `package.json` `scripts`
- Architecture tests: `packages/architecture-core/src/tests/`
- Ports: `src/core/composition/tests/ports-registry.test.ts`

## Related Documents

- [Architecture Check](./architecture-check.md)
- [Module Isolation Rules](../02-packages/module-isolation-rules.md)

## Change Impact

New package without `test:*` in build chain leaves rule 3 unsatisfied.

## Invariants

1. Every sealed capability package has a contract test.
2. `architecture:check` runs before package tests in build.
3. Composition closure tests MUST pass in CI-equivalent local build.
