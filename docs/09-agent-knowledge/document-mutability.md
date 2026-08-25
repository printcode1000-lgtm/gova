# Document Mutability

## Purpose

Not every file under `docs/` (plus the small set of root agent-instruction surfaces) may change for the same reason. This contract defines the three mutability classes every documentation change belongs to, the default-deny authorization rule that gates the most sensitive class, and the enforcement chain that keeps the rule real instead of aspirational.

## Scope

Applies to every file under `docs/`, and to `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/rules/agent-instructions.md`, and `.cursor/rules/session-standards.mdc`. A path outside these prefixes is not classified by this contract.

## The Three Classes

| Class | Meaning | Who may edit it, and when |
|---|---|---|
| `protected` | Binding project rules, architecture/runtime contracts, agent workflow, documentation-CI policy, this mutability contract itself, and the primary agent instruction surfaces. | Only with explicit authorization (see below). Normal feature work must not touch these files. |
| `editable` | Operational and application documentation that must stay current with behavior, without redefining a protected contract. | Any agent doing the matching feature/operational work, as part of that change. |
| `generated` | Overwrite-only outputs produced by a generator from live repository/registry facts. | Never hand-edited. Change the source, registry, or generator, then regenerate. |

A path not explicitly listed as `editable` or `generated` in the registry, but that falls under `docs/`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/`, or `.cursor/rules/`, is **default-deny classified as `protected`**. Silence in the registry is never permission.

## Authorization for Protected Changes

A change that touches a `protected` path is authorized only when at least one of these is true:

- the commit message contains the literal marker `[docs-contract-change]`; or
- the environment variable `DOCS_CONTRACT_CHANGE` is set to `1` or `true` for the local/CI tooling run.

**Default is deny.** Absent either signal, a protected-path change is a violation regardless of how small or well-intentioned the edit looks. This mirrors the authorization check in `scripts/docs/document-mutability.ts` (`isProtectedContractChangeAuthorized`): it checks `DOCS_CONTRACT_CHANGE` first, then falls back to scanning the latest commit message for the marker.

Authorization is a blunt, repository-wide switch for the commit/run — it does not selectively approve one protected file over another. Use it only when the task is genuinely a contract change (rewriting a binding rule, adding a new protected document, changing the runtime contract, editing an agent instruction surface), never to bulk-unlock unrelated protected edits.

## Registry

`docs/09-agent-knowledge/document-mutability.json` is the single source of truth for classification. Structure:

- `authorization` — the commit marker, environment variable name, and default-deny statement (must match this document; `scripts/docs/document-mutability.ts` validates the literal values).
- `classes` — the three class descriptions and whether authorization/hand-edit-forbidden applies.
- `entries[]` — ordered list of `{ class, path, reason, except?[] }`. `path` may be an exact file or a directory prefix (trailing `/`). `except` carves editable exceptions out of a broader protected/editable directory prefix. Classification uses **longest-prefix match** among entries of the winning class, checked in this priority order: `generated` first, then `protected`, then `editable`, then the default-deny `protected` fallback.

Never hand-classify a path outside this registry. When a new protected document is created, add its entry to `document-mutability.json` in the same authorized change.

## Enforcement

| Mechanism | What it checks | When it runs |
|---|---|---|
| `npm run docs:mutability:check` | Classifies every changed path against the registry; fails the run if any `protected` path changed without authorization, or if a `generated` path was hand-edited instead of regenerated. | Local/CI documentation validation, and any workflow that touches `docs/**`. |
| `npm run docs:ci` | Aggregate documentation pipeline (contract checks, dead-docs/link validation, mutability). Fails on any mutability violation surfaced by the underlying check. | Documentation-path pushes; see [Docs CI Contract](./contracts/docs-ci.md). |
| `npm run architecture:check` | Validates the registry's own integrity (required protected entries present, no duplicate/invalid classes, referenced paths exist) as part of the full knowledge-graph contract. | Every architecture/knowledge gate, per [`AGENTS.md`](../../AGENTS.md) §6. |

All three must stay green. A change that passes `architecture:check` but silently rewrites a protected contract is still a violation; it is not a substitute for `docs:mutability:check`.

## Loud Error Expectations

A mutability violation must never fail quietly or ambiguously. `formatMutabilityViolation()` in `scripts/docs/document-mutability.ts` defines the required shape of the error:

- states the exact violating path;
- states the registry `reason` the path is protected;
- states the exact authorization needed (`[docs-contract-change]` marker or `DOCS_CONTRACT_CHANGE=1`);
- suggests a safer editable alternative location for the underlying intent;
- restates that the default is deny.

A generated-file violation states the path, the reason, and the required remedy (fix the source/generator, run `npm run docs:generate` or `npm run architecture:docs`, commit the regenerated overwrite-only output) — never "just edit it".

Do not weaken these messages to a single line or a bare exit code. An agent hitting this gate must be able to self-correct from the error text alone.

## Normal Feature Work Touches Editable Docs Only

A change to behavior, an API, a data contract, configuration, or an operational step updates the matching **editable** document in the same change (see [Documentation Update Policy](./contracts/documentation-update-policy.md)). It does not touch:

- `docs/01-architecture/`, `docs/09-agent-knowledge/contracts/`, `runtime-contract.md`, `document-mutability.md`/`.json`, or the other protected entries in the registry;
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/rules/agent-instructions.md`, `.cursor/rules/session-standards.mdc`;
- anything under `docs/09-agent-knowledge/generated/` or the other generated entries.

If a task genuinely requires changing one of these — a new binding rule, a new protected contract, a runtime-topology change — that is a distinct, deliberate action: use the authorization marker or environment variable, update `document-mutability.json` if the set of protected/editable/generated paths changed, and say explicitly in the change description that a protected contract was modified and why.

## Related Documents

- [Protected Docs](./contracts/protected-docs.md) — the protected class in depth, with the full path list and per-area rationale.
- [Documentation Update Policy](./contracts/documentation-update-policy.md) — when editable docs must be updated, and why generated docs are never hand-edited.
- [Docs CI Contract](./contracts/docs-ci.md) — how `docs:ci` and `docs:mutability:check` fit the documentation-only GitHub workflow.
- [Generation and Drift](./generation-and-drift.md) — the generated-truth side of this same boundary.
- [Authoring Standard](./authoring-standard.md) — how to write an editable or protected document once its class is known.
