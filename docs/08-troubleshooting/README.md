# Troubleshooting Domain

## Purpose

Evidence-based records for failures likely to recur. This is not a general design directory; it preserves symptoms, root causes, diagnosis, and verified remedies.

## Workflow

1. Search `problems/` for the exact error text, command, package, route, provider, or symptom.
2. Confirm that the recorded preconditions still match the current repository.
3. Follow current architecture/owner rules even if an old incident used a different path.
4. After fixing a genuinely recurring failure, add or update one focused problem record.

## Problem Record Standard

A useful record contains:

- **Symptom** — exact observable failure.
- **Scope / Preconditions** — when it occurs.
- **Root Cause** — proven cause, not speculation.
- **Diagnosis** — commands/log evidence that distinguish it from similar failures.
- **Fix** — minimal verified remedy.
- **Prevention** — test, guard, or architecture rule that prevents recurrence where possible.
- **Related Surfaces** — relevant source/docs paths.

Keep the `problems/README.md` index aligned with the records already maintained there. Repository-wide generated document/search indexes provide an additional discovery path.

## Important

A troubleshooting workaround must never override current architecture, security, data, or release invariants. If a workaround now requires a bypass, fix the underlying contract instead.
