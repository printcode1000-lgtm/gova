# Package Creation Rules

## Purpose

Step-by-step rules for introducing a new sealed `@asol/*` package without breaking enforcement gates. Agents MUST follow this checklist before adding `packages/<new-name>/`.

## Scope

Creating new capability, composition, or support packages. Splitting existing application code into a package follows the same steps plus migration from `src/`.

## Prerequisites

1. Read [capability-map.md](../08-reference/capability-map.md) — confirm no existing owner for the capability.
2. Read [module-isolation-rules.md](./module-isolation-rules.md) — all nine rules apply from day one.
3. Decide layer: almost always `capability`; use `composition` only for a new deployment account.

## Checklist

### 1. Registry

Add an entry to `CAPABILITY_PACKAGES` in `packages/architecture-core/src/registry/capability-registry.ts`:

```typescript
{
  folder: 'my-feature-core',
  name: '@asol/my-feature-core',
  owns: 'One-line ownership statement',
  layer: 'capability',
  vendorModules: [],  // or ['vendor-pkg'] if this package alone may import it
  mayImportApp: false,
}
```

If registering a new vendor SDK, ensure no other package already owns it (or document intentional dual ownership).

### 2. Package scaffold

```text
packages/my-feature-core/
├── package.json       # name, exports (explicit doors only)
└── src/
    ├── index.ts       # primary door
    └── tests/
        └── index.test.ts
```

### 3. Exports

Define `exports` in `package.json`. Start minimal — usually `.` and optionally `./server`. Never use wildcards.

### 4. Contract test

`packages/<name>/src/tests/index.test.ts` MUST:

- Assert export surface matches `package.json`
- Assert the package imports no forbidden paths
- Assert zero `@asol/*` edges (if leaf capability) or document allowed edges

### 5. Root gate script

Add to root `package.json`:

```json
"test:my-feature-core": "npx tsx packages/my-feature-core/src/tests/index.test.ts"
```

Include in `build`, `build:static`, and `test` chains.

### 6. Port wiring (if needed)

If the package declares ports requiring application implementations:

- Add `registerMyFeatureCorePorts()` in exactly one `src/features/**/` wiring module
- Register from `src/core/composition/browser-ports.ts` and/or `server-ports.ts`
- Update `src/core/composition/tests/ports-registry.test.ts`

### 7. ESLint (if new vendor)

If `vendorModules` is non-empty, verify `eslint.config.js` bans that vendor outside the owner (usually already covered by generic vendor ownership scan).

### 8. Documentation

Update in the same change:

- [capability-map.md](../08-reference/capability-map.md)
- [package-catalog.md](../08-reference/package-catalog.md)
- [dependency-map.md](../08-reference/dependency-map.md) if edges exist

### 9. Verification

```bash
npm run test:my-feature-core
npm run architecture:check
npm run typecheck && npm run lint
```

## When NOT to create a package

Keep code in the application when:

- The logic is React/Next presentation with no reusable contract
- Moving it would make the package import `@/` (violates rule 7)
- The capability already has an owner in [capability-map.md](../08-reference/capability-map.md)

See ADR-0004 for UI-adjacent splits that sealed contracts without moving components.

## Composition packages (rare)

New deployment accounts need: `@asol/account-declarations/<account>` door, `*-composition` package, service folder under `services/`, super-admin cloud account entry. See [service-composition.md](../04-composition/service-composition.md) and [docs/06-super-admin-and-operations/super-admin-cloud-accounts.md](../../06-super-admin-and-operations/super-admin-cloud-accounts.md).

## Source Map

- Registry: `packages/architecture-core/src/registry/capability-registry.ts`
- Ownership contract: `packages/architecture-core/src/checks/capability-ownership-contract.ts`
- Ports registry test: `src/core/composition/tests/ports-registry.test.ts`

## Related Documents

- [Package Model](./package-model.md)
- [Capability Closure](../05-capability-enforcement/capability-closure.md)
- [Architecture Check](../07-enforcement/architecture-check.md)

## Change Impact

A new package touches registry, build gates, reference docs, and possibly composition roots. Missing any step leaves an unregistered or untested package that fails on the next full `npm run build`.

## Invariants

1. Unregistered `packages/*` folders fail `checkCapabilityOwnershipContract`.
2. New packages MUST have a `test:*` gate before merging.
3. Capability packages MUST NOT import `@/` — use ports and composition wiring instead.
