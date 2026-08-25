# Android/iOS/Native Task Template

## Context Pack

```bash
npx tsx scripts/docs/context.ts android/ OR ios/ OR packages/native-core
```

## Docs to read

- `docs/09-agent-knowledge/runtime-contract.md`
- `docs/09-agent-knowledge/document-mutability.md`
- `docs/09-agent-knowledge/contracts/documentation-update-policy.md`
- `docs/09-agent-knowledge/contracts/runtime-compatibility.md`
- - `docs/07-mobile-and-release/`
- `docs/09-agent-knowledge/contracts/native-capabilities.md`

## Protected docs may be touched?

**No** for normal native work. Protected release/secrets/scripts docs need authorization.

## Runtime surfaces to evaluate

Android and/or iOS plus Static out payload contract; also Development/Web if shared code changes.

## Required runtime-compatibility checks

```bash
npm run runtime:check:android
npm run runtime:check:ios
npm run runtime:check:static
npm run runtime:check
```

## Common risks

- webDir != out
- permission/entitlement drift
- store/signing publish by accident

## Relevant tests/checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
npm run docs:ci
```

## Documentation to update

Editable mobile/release operational docs. Avoid protected release/CI contracts unless authorized.

## Forbidden unless explicitly requested

- deploy / OTA publish / store release
- destructive database operations
- browser/preview verification
- hand-editing generated docs
- casually editing protected contracts
