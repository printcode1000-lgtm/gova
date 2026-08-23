# `architecture:check` false positive: `page-save-read` markers on Windows (CRLF)

## Symptom

`npm run build` or `npm run architecture:check` fails on Windows with Page Save Write Gateway violations, for example:

```text
Layer: Page Save Write Gateway
File: src/features/data-health/presentation/use-data-health-page.ts
Violation: Rendering code writes outside the page-save gateway (lines 218, 283).
```

The flagged call sites already carry a reason-bearing marker on the line above:

```ts
// page-save-read: computes a cleanup plan for review, persists nothing
const plan = await asolApi.post<Plan>(DATA_HEALTH_API.plan, body, { headers });
```

The same tree may pass on Linux CI or after a fresh clone checked out with LF-only line endings.

## Root cause

`checkPageSaveWriteGatewayContract` split file contents with `content.split('\n')`. On CRLF
working copies (typical on Windows), each logical line retained a trailing `\r`. The
`page-save-read` regex anchors at end-of-line (`$`), so the marker comment never matched and
the check treated read-shaped POSTs as ungated writes.

## Fix

In `packages/architecture-core/src/checks/page-save-write-gateway-contract.ts`, line splitting
uses `/\r?\n/` so marker detection is line-ending agnostic.

After pulling that change, re-run:

```bash
npm run architecture:check
```

## When the violation is real

If there is no `// page-save-read: <reason>` comment on one of the three lines above the call,
or the reason is shorter than eight characters, the violation is intentional:

- Stage the mutating call through page-save (`stage({ kind, execute })` or a `save` handler), or
- Add a per-call read marker that states what the POST computes and that it persists nothing, or
- Register the file in `NON_PAGE_SAVE_CAPABILITIES` with a stated reason when another capability
  owns the write.
