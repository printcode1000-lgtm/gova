# Agent Instructions & Guidelines

1. **Non-negotiable Rules**:
   - Reply in Arabic to all user chat messages. Code, commands, and file paths stay in their repo language.
   - Be brief, direct, and concise. No filler or tangents.
   - Touch-only UI: Never use hover states (`hover:`, `:hover`), `cursor-pointer`, or DOM `title` attributes. Use `active:` for press feedback and `focus-visible:` for accessibility.
   - Module isolation: Respect sealed packages under `packages/*`. Never use deep imports.
   - Single responsibility per file: Every file has one clear job and one reason to change.
   - English documentation exclusively under `docs/`.

2. **Verification Gate**:
   - `npm run typecheck && npm run lint && npm run architecture:check`
   - `npm run build`
