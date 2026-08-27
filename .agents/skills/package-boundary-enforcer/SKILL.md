---
name: package-boundary-enforcer
description: Strict package isolation enforcement and prevention of deep imports into packages/*. Use when adding, refactoring, importing, or exporting modules across package and application boundaries.
---

# Package Boundary Enforcer Guide

Operational runbook for enforcing sealed module boundaries and import isolation across all packages.

## Core Rules

1. **Declared Doors Only**: All packages in `packages/*` expose their surface strictly via `exports` fields in their `package.json`.
2. **No Deep Imports**:
   - **Forbidden**: `import { x } from '@asol/feature-core/src/internal'`
   - **Forbidden**: `import { x } from '../../packages/feature-core/...'`
   - **Allowed**: `import { x } from '@asol/feature-core'` (or declared sub-doors like `@asol/data-core/types`)
3. **No Upstream App Imports**: Capability packages (`*-core`) MUST NEVER import from `@/...` or application code.
4. **Composition Packages**: Only the 6 designated composition packages (`notifications-composition`, `orders-composition`, `products-composition`, `profiles-composition`, `submain-composition`, `sub2main-composition`) have `mayImportApp: true` to wire ports.
5. **Vendor SDK Isolation**: External vendor libraries are owned by dedicated packages and cannot be imported by application code or other packages.

## Verification

Run the architecture scan to validate all module boundaries:

```bash
npm run architecture:check
```

If boundaries fail, inspect the exact failure line in `packages/architecture-core/src/checks/` and adjust export maps or import paths accordingly.
