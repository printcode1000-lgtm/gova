# Enforcement Exceptions

## Purpose

Document the narrow exceptions to architecture enforcement — and explicit non-exceptions agents often assume incorrectly.

## Scope

Exceptions to import/seal rules. There are **no per-file waivers** for architecture checks.

## Explicit scan exclusions

| Path | Reason |
|---|---|
| `scripts/architecture-check.ts` | ESLint ignored — quotes enforcement patterns |
| `packages/architecture-core/src/contracts/**` | Contract files quote ban patterns |
| `packages/architecture-core/src/registry/**` | Registry lists vendor module names |
| `services/*/generated/**` | Synced output — source rules apply to pre-sync graph |
| `services/*/node_modules/**` | Third party |

These are not waivers for application code.

## Dual vendor ownership (not exceptions)

These are **registered** dual owners, not bypasses:

- `@aws-sdk/client-s3` — `@asol/storage-core` and `@asol/ota-core`
- `google-auth-library` — `@asol/notifications-core` and `@asol/ota-core`

## Composition mayImportApp (not an exception)

`mayImportApp: true` on six composition packages is by design — not a waiver. Capability packages MUST remain false.

## Page-save write-surface skip set

`page-save-write-surface.test.ts` excludes `api` routes because handlers persist through domain owners, not page-save. It also skips `src/core/composition/` because those files wire ports (they bind `profileApiService.createReview` and similar methods into product/profile slots) and do not execute page-authored writes. Expanding either skip set requires architectural review and a matching freeze in `page-save-gateway-contract.ts`.

## What is NOT excepted

| Assumed exception | Reality |
|---|---|
| GitHub Actions skips correctness checks | Docs validation and OIDC-only deployment dispatch exist; code correctness remains local. |
| `eslint-disable no-restricted-imports` | Forbidden without ADR |
| Test files import DB drivers | Scanned unless in approved data-core test paths |
| One-off script needs Drizzle | Use `@asol/data-core/tooling` |
| Preview deployment skips architecture | Local `npm run build` / `deploy:all` preflight remain the architecture gates. Vercel hosted builds do not re-run them. GitHub does not require checks on `main`. |

## git push --no-verify

Bypasses the local pre-push hook (`10-main-only`) only; it does not bypass the GitHub two-branch ruleset. The only recognized remote refs remain `main` and `integration`.

## Source Map

- Runner exclusions: `packages/architecture-core/src/runner.ts`
- Page-save skip: `src/features/page-save/tests/page-save-write-surface.test.ts`

## Related Documents

- [Architecture Check](./architecture-check.md)
- [Default Deny Model](../05-capability-enforcement/default-deny-model.md)

## Change Impact

New exceptions require ADR and check code comments — not silent test skip lists.

## Invariants

1. No `@architecture-ignore` annotations exist.
2. Exception list stays minimal and documented.
3. Build chain accepts no architecture waiver flag.
