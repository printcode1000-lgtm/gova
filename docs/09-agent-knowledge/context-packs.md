# Context Packs

## Purpose

A Context Pack is the mandatory live briefing for a coding agent. It answers “what must I understand before changing this target?” from the **current checkout**, without requiring a full documentation crawl or trusting stale generated snapshots.

## Usage

```bash
npx tsx scripts/docs/context.ts <target>
```

Examples:

```bash
npx tsx scripts/docs/context.ts src/features/notifications/presentation
npx tsx scripts/docs/context.ts @asol/page-save-core
npx tsx scripts/docs/context.ts services/orders
npx tsx scripts/docs/context.ts /api/products
npx tsx scripts/docs/context.ts android
npx tsx scripts/docs/context.ts build:static
npx tsx scripts/docs/context.ts NEXT_PUBLIC_ASOL_API_BASE_URL
npx tsx scripts/docs/context.ts out
```

A target may be a file, directory, package, feature, service, route, command, environment-key name, runtime, artifact, or capability/search term.

## Global Runtime Preamble

Every Context Pack begins with the project runtime contract and always exposes these five application surfaces:

- **Development**
- **Web**
- **Static `out/`**
- **Android**
- **iOS**

This is global context, not a search result. The pack then adds a **Target Runtime Footprint** showing where the graph has direct evidence. A missing footprint edge means “inspect further”; it never means “safe to ignore that runtime”.

## Target Resolution

The resolver ranks candidates using:

1. exact node ID/name/path match;
2. path-prefix ownership match;
3. package/feature/service/route/command/runtime/artifact/environment-key identity;
4. tag match;
5. title/summary substring match.

The highest-confidence seeds are expanded through a bounded structural graph. Runtime/domain hubs are intentionally excluded from structural traversal because one shared runtime can connect to thousands of source nodes; runtime relations are attached after the structural scope is resolved.

## Structural Expansion

The bounded traversal uses relationships that represent task structure:

```text
belongs-to
imports
contains
related-to
tests
invokes
```

Then the pack attaches evidence from:

```text
affects-runtime
targets-runtime
produces / consumes
configured-by
uses-environment
documents / references
```

Owner-level `imports` edges are included, so querying a package/feature/service can expose upstream/downstream owners without reading every implementation file.

## Output Contract

A pack contains these sections when relevant:

- **Project Runtime Contract — Always Evaluate All Five** — permanent five-surface knowledge.
- **Target** — resolved seeds and paths.
- **Owners / Scope** — package, feature, service, or documentation domain owners.
- **Risk Classification** — `low` / `medium` / `high` / `release-critical` with reasons (writes, APIs, auth, env, native, static, release scripts, protected/generated docs, missing coverage).
- **Required Runtime-Compatibility Test Plan** — whether the target is dev-only or release-relevant, required checks, warnings, and `npm run runtime:check*` commands.
- **Target Runtime Footprint** — direct graph evidence plus explicit evidence-gap semantics.
- **Read First** — ranked intentional and architectural documents; the runtime contract is always included.
- **Change Impact** — structurally connected source/owner surfaces.
- **Dependencies / Consumers** — source and owner-level import relationships.
- **Routes / Services** — application and deployment entry surfaces.
- **Related Commands** — root npm commands connected to the scope.
- **Artifacts** — `.next`, `out/`, or native release artifacts when related.
- **Configuration** — relevant known configuration nodes.
- **Environment Key Names** — names only; never values.
- **Tests** — ownership/import-related tests.
- **Verification** — repository gates including `runtime:check` and `docs:ci`, plus safe build guidance.
- **Guardrails** — architecture, runtime, static/native, documentation mutability, and secret-safety invariants.

## Live Truth vs Generated Snapshots

The command builds the graph directly from the current checkout every time. This matters while an agent is editing: a committed generated JSON snapshot can be one edit behind, but the live Context Pack sees the working tree immediately.

Generated catalogs under `generated/` are useful for browsing, external indexing, review, and cached retrieval. They are not more authoritative than the live graph.

## Failure Behavior

If no high-confidence target is found, the pack still returns the five-runtime contract plus canonical entry documents and asks for a more exact repository target. It must not invent ownership.

If the graph reveals multiple plausible owners, the pack reports them. The agent resolves the ambiguity using architecture registries and intentional documentation before editing.

If runtime evidence is absent or contradictory, the pack reports an evidence gap. The agent must inspect the implementation/runtime contract rather than converting missing metadata into a non-impact assumption.
