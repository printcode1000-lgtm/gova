# Development Conventions & Rules

## 1. Single Responsibility Principle (SRP)

- **One clear job per file**: Every file must have one primary reason to change.
- **Separation of concerns**: Never combine React UI components, API handlers, Drizzle ORM queries, and formatting helpers in a single file.
- **Standard feature subdirectory vocabulary**:
  - `domain/`: Business entities, policies, calculation engines, domain types.
  - `application/`: Application services, use cases, state management.
  - `presentation/` or `ui/`: React components, layout cards, modals.
  - `infrastructure/` or `server/`: Server handlers, API client calls.
  - `ports/`: Port definitions and adapter implementations.
  - `tests/`: Unit and integration test suites.

---

## 2. Touch-First UI Policy

- **Governing Contract**: `docs/04-ui-components/touch-interaction-policy.md`.
- **Forbidden Patterns**:
  - `hover:`, `group-hover:`, `:hover` styling in CSS/Tailwind.
  - `cursor-pointer`, `cursor: pointer` in CSS/Tailwind.
  - DOM `title` tooltips for informative content.
- **Mandatory Alternatives**:
  - Use `active:` for press feedback.
  - Use `focus-visible:` for keyboard/accessibility focus rings.
  - Use `aria-label` or visible text for labels and tooltips.

---

## 3. Element Identity

- **Rule**: Elements are identified by the plain HTML `id` already written in the
  source. Nothing generates, mints, validates, synchronises or catalogues it.
- **Inspector**: a standalone super-admin DOM inspector selects the exact element
  touched, reads that `id` off the node, highlights it, and copies it.
- **Enforcement**: `src/features/super-admin/tests/ui-attribute-inspector.test.ts`,
  which also asserts the inspector imports no removed package and reads no removed
  attribute family.

## 4. Overlay Chrome Isolation (`DismissableLayerBranch`)

- Diagnostic overlays (DevBadge, SuperAdminUiAttributeInspector, SuperAdminErrorFloatingButton) must carry the `data-asol-overlay-chrome` DOM attribute.
- All floating diagnostic components must be wrapped in Radix `DismissableLayerBranch` so that touching or interacting with them does not trigger an outside-dismiss on open modal dialogs (e.g. `PageSaveDialog`).
- When the Super-Admin UI inspector is active, `data-asol-ui-inspector-active` is placed on `document.documentElement` to suppress outside-pointer dismissals across all active dialogs.

---

## 5. Port-Adapter Composition Pattern

- Capability packages (`*-core`) declare abstract **ports** (e.g. `StoragePort`, `PushDeliveryPort`).
- Application features implement **adapters** matching these ports.
- Composition roots (`src/core/composition/browser-ports.ts` and `src/core/composition/server-ports.ts`) register implementations at startup.
- Never let capability packages import `@/` directly.

---

## 6. Testing & Release Gate Conventions

- Releases are gated by **local npm scripts** rather than GitHub Actions:
  - `npm run architecture:check`: AST boundary and vendor ownership verification.
  - `npm run docs:ci`: Documentation coverage, mutability check, and dead link scanner.
  - `npm run runtime:check`: 5-surface runtime compatibility checks.
  - `npm test` / `test:*-core`: Package unit and contract tests.
- **Git workflow**: `main` is the only active development and release branch.

---

## 7. Communication & Documentation Conventions

- All project documentation inside `docs/` is in **English**.
- User communication by agents in this repository is strictly in **Arabic**.
- Generated documentation under `docs/09-agent-knowledge/generated/` is overwrite-only via `npm run docs:generate` (never edited by hand).
---

## 8. Agent Execution Modes

- **Mode A**: Gateway-managed isolation with the approved bootstrap, managed worktree, locks, and explicit integration submission.
- **Mode B**: direct editing. Local B uses the canonical checkout; cloud B uses the documented Git/runner projection path.
- **Mode C**: Remote Desktop Commander is the exclusive execution transport for the complete task. All project/device reads, edits, commands, tests, Git actions, process/service control, builds, and separately authorized external-service operations execute on the paired device through Remote Desktop Commander. It never silently falls back to another transport.
- Mode C begins by running `python3 /home/hesham/gova/tools/local-agent/mode_c_preflight.py` through Remote Desktop Commander.
- Selecting a transport mode does not itself authorize commit, push, integration, deployment, destructive reset/clean, or other privileged operations.
