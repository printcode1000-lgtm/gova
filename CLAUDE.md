# Working Rules

Binding for any agent (Claude Code or other) working on this project.

1. **No browser verification.** Never use browser, preview, or computer-use tools to test or verify code. Focus on writing correct code only.
2. **Arabic communication.** Always reply to the user in Arabic in chat. Code, paths, and commands may remain in their repo language.
3. **Very brief replies.** Every response must be as short as possible without losing essential meaning — answer only what was asked; no filler, repetition, or tangents.
4. **English docs in `docs/` only.** All project documentation lives under `docs/` and must be written in English. Do not add documentation elsewhere unless explicitly requested.
5. **Read docs before editing (mandatory).** Before changing any part of the project, search `docs/` for files relevant to that area, read them, and understand current behavior, constraints, and architecture before writing code.
6. **Update docs with changes (mandatory).** When a modification affects behavior, APIs, data contracts, architecture, configuration, or operational steps for that area, update the matching `docs/` file(s) in the same change. Pure typo or comment-only fixes with no behavioral impact are exempt.
7. **Module isolation (mandatory).** Respect `docs/01-architecture/module-isolation-rules.md` on every change. Use only declared package doors (`exports`), never deep-import internals or relative paths into `packages/`, and keep `npm run architecture:check` plus the relevant `test:*-core` gates green.
