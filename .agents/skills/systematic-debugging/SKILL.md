---
name: systematic-debugging
description: Structured 4-phase debugging methodology for root-cause diagnosis and defect resolution. Use when investigating bugs, test failures, build errors, or unexpected runtime behavior.
---

# Systematic Debugging Methodology

A disciplined 4-phase framework to diagnose and fix issues without introducing regressions or speculative changes.

## Phase 1: Observation & Reproduction
- Collect exact error messages, stack traces, logs, and failing assertions.
- Reproduce the failure consistently using isolated tests or scripts (`npm test`, targeted test files).
- **DO NOT** edit code or make speculative guesses during this phase.

## Phase 2: Root-Cause Analysis & Hypothesis Testing
- Trace the execution flow from entry point to failure site using logs or AST code analysis.
- Identify the exact condition, contract violation, or state mismatch causing the bug.
- Formulate a testable hypothesis explaining why the bug occurs.

## Phase 3: Minimal Surgical Fix
- Implement the simplest, most targeted fix addressing the root cause directly.
- Maintain Single Responsibility (Rule 8) and Package Boundaries (Rule 1 & 5).
- Ensure the fix respects all 5 runtime environments (Dev, Web, Static out/, Android, iOS).

## Phase 4: Non-Visual Verification & Regression Defense
- Verify the fix against the reproduction test case.
- Run project validation suites to ensure no regressions were introduced:
  ```bash
  npm run typecheck
  npm run lint
  npm run architecture:check
  npm run runtime:check
  ```
- Add automated regression tests covering the fixed edge case.
