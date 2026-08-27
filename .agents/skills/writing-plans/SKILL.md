---
name: writing-plans
description: Detailed technical implementation plans, architectural proposals, impact assessments, and verification plans. Use when initiating non-trivial features, refactors, migrations, or architectural changes.
---

# Technical Implementation Plans Guide

Standards and structure for drafting actionable, high-quality implementation plans before code execution.

## 1. When to Create a Plan

Create an `implementation_plan.md` artifact when:
- Undertaking major architectural or package boundary changes.
- Modifying cross-cutting infrastructure (database, storage, native bridges, auth).
- Handling ambiguous or multi-step feature implementations.

## 2. Standard Plan Structure

```markdown
# [Goal Title]

## Summary
Clear overview of the change, background rationale, and expected outcomes.

## User Review Required
Highlight critical decisions, breaking changes, or user confirmations needed using GitHub callouts (`> [!IMPORTANT]`, `> [!WARNING]`).

## Open Questions
Document unresolved ambiguities or decision points directly in the plan.

## Proposed Changes
Grouped by component/package with file diff targets:
- `[MODIFY] [filename](file:///path/to/file)`
- `[NEW] [filename](file:///path/to/file)`
- `[DELETE] [filename](file:///path/to/file)`

## Verification Plan
- **Automated Tests**: Exact commands (`npm run typecheck`, `npm run architecture:check`, `npm test`).
- **Runtime Contract**: Explicit checks across Dev, Web, Static out/, Android, and iOS.
```

## 3. Workflow Protocol

1. **Research First**: Inspect code and run context pack (`npx tsx scripts/docs/context.ts <target>`) without making code changes.
2. **Draft Plan**: Write plan to artifact directory.
3. **Wait for Approval**: Obtain explicit user confirmation before executing changes.
