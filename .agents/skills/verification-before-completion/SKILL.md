---
name: verification-before-completion
description: Non-visual verification, automated test suites, static analysis, and runtime contract validation before claiming completion. Use as the final validation gate before finishing any coding task or pull request.
---

# Verification Before Completion Guide

Comprehensive verification protocol to validate functionality, integrity, and safety without browser tools or visual shortcuts.

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
```

## 2. Non-Visual Verification Rules (Rule 2)
- **Browser-based verification is strictly forbidden**: Do not use browser preview, web page inspection tools, or visual simulation to verify code.
- Rely solely on automated unit/integration test suites, static analysis, type checks, and architecture scanners.

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
