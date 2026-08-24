# Documentation Authoring Standard

## Purpose

Keep hand-written documentation useful to humans and agents without duplicating facts that repository tooling can derive.

## Required Shape for New System Documents

Use the sections that apply; omit empty sections instead of adding filler.

1. **Purpose** — what problem/capability this document explains.
2. **Scope** — what is included and explicitly excluded.
3. **Source of Truth** — code, registry, config, schema, package, or external operational source that establishes current behavior.
4. **Entry Points** — public package doors, routes, composition roots, service entry files, or commands.
5. **Flow** — important control/data flow, preferably concise and directional.
6. **Invariants** — statements a safe change must preserve.
7. **Failure Modes** — material ways the system fails and where they surface.
8. **Change Impact** — what else must be inspected when this area changes.
9. **Verification** — focused tests/checks proving the behavior.
10. **Related Documents** — only high-value links; generated catalogs should supply exhaustive inventories.

## Writing Rules

- Documentation is English and lives under `docs/`.
- Put the answer before background. Agents should understand the rule from the first screen.
- Prefer explicit paths, package names, commands, runtime targets, and invariants over descriptive prose.
- State **MUST**, **MUST NOT**, **ONLY**, or **CAN** when a statement is actually binding.
- Distinguish current behavior from proposals and historical rationale.
- Do not copy generated lists of files, routes, package exports, imports, or tests into manual docs.
- Do not include generated dates such as "last updated"; Git history already records that information.
- Do not include sensitive runtime values. Refer to variable names and provisioning procedures only.
- Avoid screenshots for behavior that can be described as code/config/state; screenshots age quickly and are poor agent context.
- Prefer one canonical document per policy. Other docs link to it instead of paraphrasing the same rule.

## Document Metadata Through Structure

This repository intentionally avoids mandatory YAML front matter. Machine discovery derives metadata from path, H1, links, path/package mentions, and `domain-registry.json`. This keeps existing documents compatible and avoids a repository-wide manual metadata migration.

Add structured metadata only when a future requirement cannot be derived reliably.

## When Updating Existing Large Documents

Do not rewrite a mature document merely to fit this template. Improve it incrementally:

- add a clear source-of-truth section if missing;
- replace stale manual inventories with links to generated catalogs;
- add change-impact and verification guidance;
- split only when the document genuinely contains multiple independent responsibilities.

The goal is higher information density and safer retrieval, not uniform formatting for its own sake.
