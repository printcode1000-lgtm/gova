# Protected Docs

## Purpose

Defines the `protected` mutability class in depth: which files it covers, why each is protected, and the exact authorization an agent must supply before touching one. Read [Document Mutability](../document-mutability.md) first for the class model and enforcement chain; this document is the protected-class detail it links to.

## Rule

A `protected` path may change only when the commit message contains `[docs-contract-change]`, or `DOCS_CONTRACT_CHANGE=1`/`true` is set for the tooling run. **Default is deny.** No other justification (urgency, a "tiny" wording fix, a typo in a binding rule) substitutes for one of these two signals. If neither is present, do not edit the file — propose the change, or route the underlying need into an editable document instead.

## Current Protected Paths

The authoritative list is `docs/09-agent-knowledge/document-mutability.json` (`class: "protected"` entries). At the time of writing it covers:

| Path | Why it is protected |
|---|---|
| `docs/09-agent-knowledge/runtime-contract.md` | Binding five-surface runtime contract |
| `docs/09-agent-knowledge/coverage-contract.md` | Binding knowledge coverage contract |
| `docs/09-agent-knowledge/knowledge-schema.md` | Binding Knowledge Graph schema |
| `docs/09-agent-knowledge/context-packs.md` | Binding Context Pack contract |
| `docs/09-agent-knowledge/generation-and-drift.md` | Binding generation and drift policy |
| `docs/09-agent-knowledge/authoring-standard.md` | Binding documentation authoring standard |
| `docs/09-agent-knowledge/document-mutability.md` | Binding documentation mutability model (this contract's parent) |
| `docs/09-agent-knowledge/document-mutability.json` | Machine-readable mutability registry |
| `docs/09-agent-knowledge/agent-protocol.md` | Binding agent workflow protocol |
| `docs/09-agent-knowledge/domain-registry.json` | Intentional domain-to-source registry |
| `docs/09-agent-knowledge/contracts/` | This directory — protected agent-knowledge contracts hub |
| `docs/01-architecture/` | Architecture contracts and enforcement docs |
| `docs/07-mobile-and-release/release-and-secrets.md` | Release and secrets safety contract |
| `docs/07-mobile-and-release/deployment-targets.md` | Deployment target contract |
| `docs/07-mobile-and-release/scripts-and-workflows.md` | Scripts and workflow contract including main-only |
| `docs/07-mobile-and-release/github-ci-policy.md` | Documentation/GitHub CI policy contract |
| `docs/04-ui-components/touch-interaction-policy.md` | Touch-only UI policy |
| `docs/04-ui-components/page-snapshot-system.md` | Page snapshot system contract |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Primary agent instruction surfaces |
| `.agents/rules/agent-instructions.md` | Agents rules instruction surface |

Treat this table as a convenience index, not the source of truth: the registry can gain new protected entries without this table being regenerated. When in doubt, check `document-mutability.json` for the current entry, or run the classification described in [Document Mutability](../document-mutability.md).

## Entire-Directory Protection

`docs/09-agent-knowledge/contracts/` and `docs/01-architecture/` are protected as whole directories (trailing-`/` entries). Every file created under either — including new contract documents like this one — is protected from the moment it exists, with no separate per-file registration needed. Adding a *new* contract document is itself a protected-class change and needs the same authorization as editing an existing one.

## Why These Specific Areas

- **Runtime/knowledge contracts** (`runtime-contract.md`, `coverage-contract.md`, `knowledge-schema.md`, `context-packs.md`, `generation-and-drift.md`, `authoring-standard.md`, `agent-protocol.md`, this mutability system): these define how every agent discovers context and what "safe" means project-wide. An uncontrolled edit here silently changes the ground rules every other change is checked against.
- **`docs/01-architecture/`**: package boundaries, isolation rules, and enforcement scripts are the mechanism that stops sealed packages from being bypassed. Documentation here is normative, not descriptive.
- **Release/CI/touch-UI/page-snapshot contracts**: each backs a hard invariant enforced elsewhere (branch policy, GitHub Actions scope, touch-only interaction, page snapshot adoption). Loosening the doc without the matching enforcement change would document a rule that no longer holds.
- **Agent instruction surfaces**: `AGENTS.md`/`CLAUDE.md`/`GEMINI.md`/`.agents/rules/agent-instructions.md` carry the same project-wide rules. They must not drift out of sync with each other or be edited casually mid-feature-task.

## What To Do Instead of Editing a Protected Doc

Most tasks that feel like they need a protected-doc edit actually need one of:

- an **editable** document under the matching domain (`docs/00-*`, `docs/02-*` … `docs/08-*`, or the non-protected parts of `docs/04-*`/`docs/07-*`/`docs/09-agent-knowledge/`) that explains the feature-specific behavior without redefining the binding rule;
- a template under `docs/09-agent-knowledge/templates/` if the goal is agent-workflow guidance rather than a new binding rule;
- a troubleshooting entry under `docs/08-troubleshooting/problems/` if the goal is recording a resolved failure.

See [Documentation Update Policy](./documentation-update-policy.md) for the full decision rule, and [Protected Doc Change Task](../templates/protected-doc-change-task.md) for the checklist to use on the rare occasion a protected change really is required.

## Enforcement

`npm run docs:mutability:check`, `npm run docs:ci`, and the registry-integrity portion of `npm run architecture:check` all treat an unauthorized protected-path diff as a hard failure. See [Document Mutability](../document-mutability.md) for the exact error shape agents must produce and respect.

## Related Documents

- [Document Mutability](../document-mutability.md)
- [Documentation Update Policy](./documentation-update-policy.md)
- [Docs CI Contract](./docs-ci.md)
- [Protected Doc Change Task](../templates/protected-doc-change-task.md)
