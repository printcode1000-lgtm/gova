# Agent Knowledge Coverage Contract

## Purpose

This file defines the documentation/knowledge goals that must remain true for every coding agent working on Gova. It is a coverage contract, not a prose roadmap: the implementation under `scripts/docs/` and `npm run architecture:check` must keep these properties enforceable.

## Required Goals

| Goal | Required state | Enforcement / source |
|---|---|---|
| Agent-first entry | An agent has one canonical starting point and domain navigation instead of guessing file names. | `docs/README.md`; required domain `README.md` files; `scripts/docs/check.ts`. |
| Read-before-edit | Every supported agent instruction surface tells the agent to obtain task context before editing. | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/rules/agent-instructions.md`; marker validation in `scripts/docs/check.ts`. |
| Five application surfaces | Development, Web, Static `out/`, Android and iOS are always visible and must all be evaluated. | `runtime-contract.md`; runtime nodes/artifact topology; mandatory Context Pack section; graph contract checks. |
| Generated truth vs intentional truth | Derivable inventories come from the repository; hand-written docs explain intent, invariants and policy. | `generation-and-drift.md`, generators, architecture registries. |
| Stable ownership | Packages/features/services/domains are explicit graph owners, not inferred ad hoc by an agent. | package manifests + architecture capability registry + `src/features/*` + `services/*` + `domain-registry.json`. |
| Relational knowledge | The system exposes typed relationships, not only search text. | Knowledge Graph v2 nodes/edges in `scripts/docs/model.ts` and `repository-knowledge.ts`. |
| Owner-level dependencies | A capability/feature/service can discover upstream/downstream owners without reading every file manually. | Aggregate owner `imports` edges derived from production imports. |
| External dependency visibility | npm dependencies are explicit nodes and declaration/import relationships, not invisible package-manager text. | `external-dependency` nodes + `declares-dependency` and `imports` edges. |
| Routes and API boundaries | App Router pages/handlers are discoverable with runtime implications. | Route nodes from `src/app/**`; route/runtime graph checks; static-handler exclusion invariant. |
| Simulation scope | Simulation coverage is limited to routes and flows intended for ordinary end users. `super-admin`, `dev`, developer-only, operational, diagnostic, maintenance, and other internal-only pages are excluded even when technically routable. | Binding simulation coverage invariant in this contract. |
| Native visibility | Android/iOS source/config is represented, not hidden behind the web TypeScript tree. | Text source scan of `android/`, `ios/`, `fastlane/`; native runtime edges. |
| Build artifact topology | Agents know `.next` and `out/` are different artifacts and that Android/iOS consume `out/`. | Artifact nodes, `produces`/`consumes` edges, `runtime-contract.md`, contract checks. |
| Commands as knowledge | Root npm scripts can be discovered and related to source, other commands, runtimes and artifacts. | Command nodes + `invokes`, `targets-runtime`, `produces` edges. |
| Environment usage without secrets | Agents can discover environment key names and consumers without storing values. | Environment-key nodes, `uses-environment` edges, `.env.example`, command-value redaction, redaction contract check. |
| Tests as impact evidence | Tests are related to owners and imported targets so agents can find focused verification. | Test nodes + `tests` edges. |
| Documentation relationships | Documents are searchable, linked, assigned to a domain, and connected to repository objects they describe. | Markdown extraction + Domain nodes + `references`/`documents`/`belongs-to` edges. |
| Task-sized context | The default workflow returns a bounded relevant neighborhood rather than dumping the whole repository. | `scripts/docs/context.ts`; traversal excludes high-cardinality runtime/domain hubs from structural expansion. |
| No silent uncertainty | Missing resolution or ambiguous scope must be surfaced instead of invented. | Context Pack failure behavior and explicit runtime evidence-gap wording. |
| Drift detection | The live graph contract is validated on every architecture check; committed generated snapshots, when present, must match regeneration. | `scripts/docs/check.ts`, `diffGeneratedKnowledge()`, `npm run architecture:check`. |
| Repository-wide search surface | External tools/agents can consume deterministic JSON/search/catalog output. | generated `knowledge-graph.json`, `search-index.json`, catalogs. |
| Documentation stays with change | Behavior/API/data/config/runtime/operations changes update intentional **editable** docs in the same change. Protected docs require authorization. Generated docs are regenerated, never hand-edited. | Agent rules + `document-mutability.md` + `docs:mutability:check` / `docs:ci`. |
| No duplicate factual inventories | Hand-written docs link to generated facts rather than maintaining parallel package/route/import/test lists. | `authoring-standard.md`; generated catalogs. |
| Document mutability | Every docs/agent-instruction path is classified protected/editable/generated; unauthorized protected edits and hand-edited generated outputs fail loudly. | `document-mutability.json` + `scripts/docs/document-mutability.ts` + `npm run docs:mutability:check` / `docs:ci`. |
| Dead docs detection | Broken internal links, missing required contracts/templates, and editable-doc attempts to redefine protected contracts fail validation. | `scripts/docs/dead-docs.ts` + generated dead-docs report. |
| Risk classification | Context Packs expose low/medium/high/release-critical risk with reasons. | `scripts/docs/risk-classifier.ts`. |
| Runtime-compatibility plan | Context Packs expose required runtime checks; `npm run runtime:check*` enforces safe non-publishing surface checks. | `scripts/docs/runtime-test-plan.ts` + `scripts/runtime/*` + `contracts/runtime-compatibility.md`. |
| Docs CI | Documentation-aware CI entry point validates mutability, generation drift, dead docs, env safety, templates, and agent markers. | `npm run docs:ci` + `.github/workflows/docs.yml`. |

## Simulation Coverage Scope

Simulation coverage **MUST** target only routes and flows intended for ordinary end users.

The following are permanently excluded from simulation coverage:

- `super-admin` routes and flows;
- `dev` routes and developer-only tooling;
- operational, diagnostic, maintenance, and other internal-only pages, even when technically routable.

Excluded routes **MUST NOT** be counted as missing simulation coverage, required simulation targets, or gaps in user-flow completeness.

## Knowledge Graph v2 Coverage

The graph must represent at least these node classes:

```text
domain
 document
 package
 external-dependency
 feature
 service
 route
 source / script / test
 config
 command
 environment-key
 runtime
 artifact
```

And at least these relationship classes:

```text
belongs-to          contains         imports
declares-dependency references       documents
related-to          tests            invokes
uses-environment    affects-runtime  targets-runtime
configured-by       produces         consumes
```

`npm run architecture:check` fails if the mandatory classes/relationships, runtime nodes, artifact topology, native mappings, domain assignments, owner-level dependency relationships, owner-to-external relationships, agent instruction markers, or redaction invariants are broken.

## Runtime Coverage Is Global, Not Query-Dependent

The runtime contract is intentionally different from ordinary context retrieval. It is **always included**, even if the requested target is a single database file, a package manifest, a deployment script, or an unrelated-looking UI component. The target-specific runtime footprint is additional evidence; it never reduces the global obligation to consider all five application surfaces.

## Generated Views

`npm run docs:generate` (also via `npm run architecture:docs`) materializes the live model under `docs/09-agent-knowledge/generated/`:

- `catalogs/` — repository, document, route, API contract, command, environment, native capability, runtime, operational
- `reports/` — change-impact, doc-coverage-score, write-surface-map, env-safety-matrix, dead-docs, runtime-compatibility-matrix, graph-health
- `graphs/` — `knowledge-graph.json`, `search-index.json`

These files are overwrite-only outputs. The live graph and contract are built from the current checkout, so an agent can obtain correct context while a change is still in progress.

## Acceptance Rule

A documentation/knowledge change is incomplete if it improves prose but leaves an agent unable to answer any of these questions before editing:

1. Who owns this capability/path?
2. What depends on it and what does it depend on, including external npm dependencies?
3. Which routes/services/tests/configs/commands/environment keys/artifacts are related?
4. What intentional documents must be read first?
5. What does this mean for Development, Web, Static `out/`, Android, and iOS?
6. Which boundary/gateway/invariant must not be bypassed?
7. How is the change verified without exposing secrets or relying on stale generated facts?
8. Is the documentation path protected, editable, or generated — and is the edit authorized?
9. Which runtime-compatibility checks are required for this target?
