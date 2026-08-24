# Context Packs

## Purpose

A context pack is a live, task-specific briefing for a coding agent. It answers "what must I understand before changing this target?" without requiring a full documentation crawl.

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
npx tsx scripts/docs/context.ts image-storage
```

## Target Resolution

The resolver ranks candidates using:

1. exact node ID/name/path match;
2. path-prefix ownership match;
3. package/feature/service/route identity;
4. tag match;
5. title/summary substring match.

The highest-confidence seeds are expanded through direct graph relationships. The command is read-only and does not generate or edit repository files.

## Output Contract

A pack contains these sections when relevant:

- **Target** — resolved seeds and repository paths.
- **Owners / Scope** — packages, features, services, or documentation domains that own the target.
- **Read First** — ranked intentional and architectural documents.
- **Change Impact** — direct routes, services, source areas, and documentation surfaces connected to the target.
- **Dependencies** — known direct imports from the target/owner.
- **Consumers** — known direct reverse importers.
- **Tests** — nearby or graph-related test nodes.
- **Verification** — project gates and targeted commands discoverable from the repository.
- **Guardrails** — mandatory architecture and documentation rules.

## Why Packs Are Live

Generated snapshots are useful for browsing, code review, and external tools, but a pack is built directly from the current checkout. This avoids using a stale committed snapshot while an agent is in the middle of a change.

## Failure Behavior

If no high-confidence target is found, the command returns repository/domain entry points and instructs the agent to refine the target. It must not invent ownership.

If the graph reveals multiple owners, the pack reports them rather than silently choosing one. The agent must resolve the ambiguity from architecture registries and intentional docs before editing.
