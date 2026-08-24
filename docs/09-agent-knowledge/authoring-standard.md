# Documentation Authoring Standard

## Purpose

Keep hand-written documentation useful to humans and agents without duplicating facts tooling can derive, and ensure system documents explain runtime compatibility rather than describing only the web path.

## Required Shape for New System Documents

Use the sections that apply; omit empty sections instead of adding filler.

1. **Purpose** — capability/problem explained.
2. **Scope** — included and explicitly excluded surfaces.
3. **Source of Truth** — code, registry, config, schema, package, or external operational source establishing current behavior.
4. **Entry Points** — public package doors, routes, composition roots, service entry files, or commands.
5. **Runtime Surfaces** — impact on **Development, Web, Static `out/`, Android, and iOS**. If a surface is intentionally unaffected, state why from architecture/runtime evidence rather than omission.
6. **Flow** — important control/data flow, preferably concise and directional.
7. **Invariants** — statements a safe change must preserve.
8. **Failure Modes** — material failures and where they surface.
9. **Change Impact** — what else must be inspected when this area changes.
10. **Verification** — focused tests/checks proving behavior without unsafe side effects.
11. **Related Documents** — only high-value links; generated catalogs supply exhaustive inventories.

## Runtime Writing Rule

[Project Runtime Contract](./runtime-contract.md) is canonical. Do not copy its entire matrix into every feature document. Instead add concise feature-specific implications such as:

```text
Runtime Surfaces
- Development: local-only guard is active.
- Web: server route `/api/x` owns persistence.
- Static out / Android / iOS: client uses remote API base; no local route handler exists in out/.
```

A document that explains shared client behavior but only discusses “the website” is incomplete unless code evidence proves the behavior cannot reach static/native surfaces.

## Writing Rules

- Documentation is English and lives under `docs/`.
- Put the binding rule before background.
- Prefer explicit paths, package names, commands, runtime targets, artifacts, environment **key names**, and invariants.
- State **MUST**, **MUST NOT**, **ONLY**, or **CAN** when actually binding.
- Distinguish current behavior from proposals and historical rationale.
- Do not copy generated lists of files, routes, package exports, imports, tests, commands, or environment consumers into manual docs.
- Do not include generated dates such as “last updated”; Git history records them.
- Do not include sensitive runtime values. Refer to key names and provisioning procedures only.
- Never paste raw root npm command text into a generated/manual catalog when it embeds environment assignment values; use names or redacted rendering.
- Avoid screenshots for behavior that can be described as code/config/state.
- Prefer one canonical document per policy; other documents link to it.
- Treat `.next` and `out/` as different artifacts. Do not use “build” ambiguously when the distinction matters.
- Treat Android/iOS as native shells with shared static payload **and** platform-specific behavior; neither statement alone is sufficient.

## Document Metadata Through Structure

Mandatory YAML front matter is intentionally avoided. Machine discovery derives metadata from path, H1, links, repository/package/command/environment/artifact mentions, documentation domains, and the live graph.

Add structured metadata only when a future requirement cannot be derived reliably.

## When Updating Existing Large Documents

Do not rewrite a mature document solely to fit this template. Improve it incrementally:

- add/clarify source of truth;
- add a Runtime Surfaces section when cross-runtime behavior is material or currently ambiguous;
- replace stale manual inventories with links to live/generated catalogs;
- add change-impact and verification guidance;
- link to `runtime-contract.md` rather than duplicating its global rules;
- split only when the document genuinely contains independent responsibilities.

The goal is higher information density, cross-runtime correctness, and safer retrieval — not formatting uniformity.
