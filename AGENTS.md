# Working Rules

Binding on every agent and developer working on this project.

1. **Documentation and architecture before and during any change (mandatory).** The documentation system is the primary entry point for understanding and working on the project:
   - To understand the project or its structure, start with `docs/README.md`, then `docs/09-agent-knowledge/README.md`, and use the generated Knowledge Graph and catalogs.
   - For research or a specific change, run the Context Pack through `npx tsx scripts/docs/context.ts <target>` for the relevant target, then read the documents and contracts it identifies before writing code.
   - For architectural or module-boundary changes, read the relevant documents under `docs/01-architecture/`, especially `docs/01-architecture/02-packages/module-isolation-rules.md`. Use only package entry points declared through `exports`; never use deep imports or relative paths to enter `packages/`.
   - When behavior, APIs, data, architecture, configuration, or runtime operation changes, update the related editable documentation in the same change.
   - Follow `docs/09-agent-knowledge/document-mutability.md`: do not modify protected docs without explicit user authorization, and never edit generated docs by hand; update their source and regenerate them.
   - Keep `npm run architecture:check`, `npm run docs:ci`, and the relevant `test:*-core` tests passing.
2. **Communicate in Arabic.** Always reply to the user in Arabic. Code, paths, and commands may remain in the repository's language.
3. **Keep responses extremely concise.** Answer with the shortest wording possible without losing essential meaning. No filler, repetition, or unrelated content.
4. **English documentation inside `docs/` only.** All project documentation must be written in English and live inside `docs/`. Root instruction surfaces are agent instructions, not substitutes for project documentation.
5. **Touch-only UI (mandatory).** Before any UI change, verify that `src/app/globals.css` exists. Inside `src/` and `packages/`, never use `hover:`, `group-hover:`, `:hover`, `cursor-pointer`, `cursor: pointer`, or DOM `title`. Use `active:`, `focus-visible:`, and `aria-label` where appropriate. Do not reintroduce desktop-browser behaviors already disabled by `globals.css`. The protected governing policy is `docs/04-ui-components/touch-interaction-policy.md`.
6. **The UI policy is a protected contract.** Read `docs/04-ui-components/touch-interaction-policy.md` before any interaction or UI-related change. Do not modify this policy during normal work unless the user explicitly authorizes changing the contract itself; feature documentation must apply it, not redefine it.
7. **Single responsibility per file (mandatory).** Every file must have one clear responsibility and one primary reason to change. Do not mix UI, API, domain logic, or unrelated concerns in the same file. If a second responsibility appears, split the file. `index`/barrel files limited to re-exports are allowed.
8. **Respect all runtime environments.** Any change that is not exclusively development-only must be evaluated against Development, Production Web, Static `out/`, Android, and iOS, following `docs/09-agent-knowledge/runtime-contract.md` and the applicable `npm run runtime:check` checks. Code and pages under the `dev` scope are evaluated only for Development, while also ensuring they do not leak into or become required dependencies of release environments.
9. **These rules are globally mandatory and cannot be bypassed.** The eight rules above bind every agent and developer working on this project and must not be overridden, weakened, bypassed, or worked around. Agents and developers may create additional instruction files solely to support their own work. Such files remain independent and local to their owner; they do not change documentation behavior, reclassify or modify protected or generated documentation, become global rules for others, conflict with these rules, or override them.
10. Project-specific rules, repository architecture constraints, and project documentation always take precedence over generic Skills, MCP instructions, and tool guidance. MCP/tool instructions define how a tool should be used, but they must never override or conflict with repository rules or project-specific architectural requirements. When instructions overlap or conflict, follow this priority order: **Project rules and documentation → Task-specific instructions → Skills → MCP/tool guidance**.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
