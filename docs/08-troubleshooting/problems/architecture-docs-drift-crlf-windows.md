# `architecture:check` false positive: generated architecture docs on Windows (CRLF)

## Symptom

`npm run architecture:check` or `npm run deploy:all` fails with `Architecture Docs Drift` even though the generated reference documents were not semantically changed. Typical output shows the first mismatch on line 1 with an extra `\r` in the actual value:

```text
expected "<!-- GENERATED FILE. DO NOT EDIT BY HAND."
actual   "<!-- GENERATED FILE. DO NOT EDIT BY HAND.\r"
```

`feature-seams.md` may also be reported simply as `generated reference is stale` for the same reason.

## Root cause

The repository is commonly checked out on Windows with `core.autocrlf=true`. Git may therefore materialize tracked Markdown as `CRLF`, while the architecture renderers deterministically produce `LF` strings in memory.

The drift contract previously compared those byte-level strings directly, so identical Markdown content could fail solely because of line-ending representation.

## Fix

`checkArchitectureDocsDriftContract` now normalizes both `LF` and `CRLF` before deciding whether generated content is stale and before calculating the first meaningful mismatch.

This does not weaken the architecture gate: missing files and real content changes still fail and still require:

```bash
npm run architecture:docs
```

## Verification

After pulling the fix, run:

```bash
npm run architecture:check
```

A Windows checkout whose only difference is `CRLF` must pass the generated-document drift section. Any semantic change to a generated reference file must continue to fail.
