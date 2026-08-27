---
name: deep-analysis-before-change
description: Architectural dependency and contract analysis prior to code modifications. Use before modifying complex features, package boundaries, cross-cutting concerns, or multi-runtime dependencies.
---

# Deep Analysis Before Change Guide

Protocol for establishing full architectural context and dependency impact before writing or modifying code.

## 1. Context Pack Discovery

Run the automated context pack utility to discover ownership, dependencies, consumers, and contracts:

```bash
npx tsx scripts/docs/context.ts <target>
```
Where `<target>` is the specific file, capability, package, feature, or route being investigated.

## 2. Multi-Runtime Impact Evaluation

Evaluate the proposed change across all five runtime environments defined in `docs/09-agent-knowledge/runtime-contract.md`:
1. **Development**: Local development, Turbopack, hot reload, dev tooling.
2. **Production Web**: Next.js server runtime, SSR/API routes, Vercel edge/node deployment.
3. **Static `out/`**: Static export bundle integrity and remote API boundary compliance.
4. **Android**: Capacitor Android container, plugins, permissions, and Gradle builds.
5. **iOS**: Capacitor iOS container, entitlements, permissions, and native bridge.

## 3. Boundary & Gateway Verification

1. Verify package ownership in `docs/01-architecture/08-reference/capability-map.md`.
2. Confirm the module's declared public doors in `docs/01-architecture/08-reference/package-catalog.md`.
3. Check for mandatory gateways: `@asol/data-core` (DB), `@asol/storage-core` (Storage), `@asol/native-core` (Native), `@asol/page-save-core` (Writes).
4. Verify document mutability: check `docs/09-agent-knowledge/document-mutability.md` before editing any documentation files.
