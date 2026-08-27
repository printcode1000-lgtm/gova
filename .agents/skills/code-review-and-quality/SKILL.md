---
name: code-review-and-quality
description: Rigorous code review covering correctness, security, package isolation, touch interaction policy, single responsibility, and performance. Use during pre-merge reviews, refactoring assessments, or quality audits.
---

# Code Review & Quality Assurance Guide

Standards and verification checklist for reviewing code changes in the repository.

## Review Checklist

### 1. Architectural & Isolation Rules
- **Package Doors Only**: Changes under `packages/` expose functionality via explicit `exports` in `package.json`. No internal relative imports across package boundaries.
- **Vendor SDK Ownership**: External SDKs (AWS, SQLite, Capacitor, Sharp, etc.) must only be imported by their owning package (see `docs/01-architecture/02-packages/module-isolation-rules.md`).
- **Composition Roots**: Ports are registered exclusively in `src/core/composition/browser-ports.ts` or `server-ports.ts`.

### 2. Single Responsibility (Rule 8)
- Every file must have a single clear job and one reason to change.
- Never mix UI, API routes, database operations, or domain logic in the same file.

### 3. Touch-Only UI Compliance (Rule 6)
- **Forbidden**: `hover:`, `group-hover:`, `:hover`, `cursor-pointer`, `cursor: pointer`, and DOM element `title` attributes.
- **Required**: `active:`, `focus-visible:`, and `aria-label`.

### 4. Security & Gateways
- All database operations route through `@asol/data-core`.
- All object storage writes route through `@asol/storage-core`.
- All page persistence routes through `@asol/page-save-core`.

### 5. Automated Verification Gates
Run the enforcement suite:
```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run docs:ci
```
