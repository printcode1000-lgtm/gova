# Working Rules

Binding for any agent (Claude Code or other) working on this project.

1. **No browser verification.** Never use browser, preview, or computer-use tools to test or verify code. Focus on writing correct code only.
2. **Arabic communication.** Always reply to the user in Arabic in chat. Code, paths, and commands may remain in their repo language.
3. **Very brief replies.** Every response must be as short as possible without losing essential meaning — answer only what was asked; no filler, repetition, or tangents.
4. **English docs in `docs/` only.** All project documentation lives under `docs/` and must be written in English. Do not add documentation elsewhere unless explicitly requested.
5. **Read docs before editing (mandatory).** Before changing any part of the project, search `docs/` for files relevant to that area, read them, and understand current behavior, constraints, and architecture before writing code.
6. **Update docs with changes (mandatory).** When a modification affects behavior, APIs, data contracts, architecture, configuration, or operational steps for that area, update the matching `docs/` file(s) in the same change. Pure typo or comment-only fixes with no behavioral impact are exempt.
7. **Module isolation (mandatory).** Respect `docs/01-architecture/module-isolation-rules.md` on every change. Use only declared package doors (`exports`), never deep-import internals or relative paths into `packages/`, and keep `npm run architecture:check` plus the relevant `test:*-core` gates green.
8. **Touch-only UI (mandatory).** The application is built exclusively for mobile touch devices. Never introduce `hover:`, `group-hover:`, a CSS `:hover` selector, or `cursor-pointer`/`cursor: pointer` anywhere in `src/` or `packages/`. Use `active:` for press feedback, keep `focus-visible:` for accessibility, and keep `transition-*`. Never put a `title` attribute on a DOM element — it renders the browser hover tooltip that no touch user can reach; use `aria-label` (a `title` prop on a React component is fine). Do not reintroduce desktop browser chrome (tap highlight, text selection on controls, double-tap zoom delay, visible scrollbars) — the baseline in `src/app/globals.css` neutralizes it. Full policy: `docs/04-ui-components/touch-interaction-policy.md`.
9. **Single responsibility per file (mandatory).** On every create or edit, each file must have one responsibility only — one clear job and one primary reason to change. Do not mix unrelated concerns (UI, API, domain logic, unrelated helpers) in one file; split when a second responsibility appears. Barrel/index re-exports only are fine. See `AGENTS.md` §3a and `docs/01-architecture/module-isolation-rules.md` rule 8.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
