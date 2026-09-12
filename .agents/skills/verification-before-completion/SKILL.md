---
name: verification-before-completion
description: Layered verification using automated tests, static analysis, runtime checks, and browser/Playwright validation when appropriate before claiming completion.
---

# Verification Before Completion Guide

Comprehensive verification protocol combining automated checks with browser/Playwright validation when runtime or UI behavior needs direct evidence.

## 1. Golden Verification Stack

Always run the standard validation gates from cheapest to most comprehensive:

```bash
# 1. Type correctness
npm run typecheck

# 2. Linting & styling rules
npm run lint

# 3. Architecture & package boundary checks
npm run architecture:check

# 4. Five-runtime compatibility check
npm run runtime:check

# 5. Documentation & knowledge graph CI
npm run docs:ci

# 6. When UI/browser-runtime behavior changed, add direct Playwright verification
# playwright-cli open http://127.0.0.1:3001
```

## 2. Layered Verification Rules (Rule 2)
- Browser and Playwright verification are allowed and encouraged when UI, navigation, rendering, browser APIs, or runtime behavior materially benefit from direct execution evidence.
- Browser evidence supplements rather than replaces automated unit/integration tests, static analysis, type checks, architecture checks, and runtime checks.
- Use the shared toolbox documented in `docs/06-super-admin-and-operations/agent-development-tooling.md`, while preserving the selected A/B/C transport rules.

## 3. Targeted Test Execution
Run the specific test suites for modified capabilities:
```bash
# Example: Package core tests
npm run test:data-core
npm run test:native-core
npm run test:compositions
```

## 4. Multi-Runtime Certification
Ensure the change functions seamlessly across:
1. Development
2. Production Web
3. Static `out/`
4. Android (Capacitor)
5. iOS (Capacitor)
