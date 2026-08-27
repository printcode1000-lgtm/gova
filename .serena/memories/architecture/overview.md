# Gova Architecture Overview

## Repository Structure & Core Principles
- **Monorepo Topology**: 41 sealed `@asol/*` packages in `packages/`, 47 application features in `src/features/`, 6 microservices in `services/`, native shells in `android/` and `ios/`.
- **Governing Invariants**:
  1. Single capability ownership (exactly one `@asol/*` owner per capability).
  2. Declared doors only via `package.json` `exports` (no deep imports into `packages/*`).
  3. Strict layer stack: UI -> Hooks -> Client Services -> AsolApiClient -> Business APIs -> Server Services -> Query/Command -> Repository -> Database Client -> SQLite/Turso.
  4. Single Responsibility Principle (SRP) per file.
  5. Touch-First UI (no hover/cursor-pointer in production source).
  6. 5-Surface Runtime evaluation on every change.
- **Verification Gates**:
  - `npm run architecture:check` enforces module isolation, vendor ownership, layer contracts, and native platform contracts.
  - `npm run docs:ci` and `npm run runtime:check` ensure contract compliance.
  - Local tests (`test:*-core`, `test:compositions`) gate release.
- **Context Discovery**:
  - Mandatory Context Pack: `npx tsx scripts/docs/context.ts <target>`.
