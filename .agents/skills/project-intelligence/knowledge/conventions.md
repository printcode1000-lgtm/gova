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

## 3. UI Attribute System & UiRegistry

- All interactive and key structural components must include typed `data-ui-*` diagnostic attributes generated via `@asol/ui-registry-core`.
- Enables automated real-user simulation and UI attribute inspection in Super Admin mode without fragile DOM selectors.
- Enforced by `packages/architecture-core/src/tests/ui-attribute-guard.test.ts`.

---

## 4. Port-Adapter Composition Pattern

- Capability packages (`*-core`) declare abstract **ports** (e.g. `StoragePort`, `PushDeliveryPort`).
- Application features implement **adapters** matching these ports.
- Composition roots (`src/core/composition/browser-ports.ts` and `src/core/composition/server-ports.ts`) register implementations at startup.
- Never let capability packages import `@/` directly.

---

## 5. Testing & Release Gate Conventions

- Releases are gated by **local npm scripts** rather than GitHub Actions:
  - `npm run architecture:check`: AST boundary and vendor ownership verification.
  - `npm run docs:ci`: Documentation coverage, mutability check, and dead link scanner.
  - `npm run runtime:check`: 5-surface runtime compatibility checks.
  - `npm test` / `test:*-core`: Package unit and contract tests.
- **Git workflow**: `main` is the only active development and release branch.

---

## 6. Communication & Documentation Conventions

- All project documentation inside `docs/` is in **English**.
- User communication by agents in this repository is strictly in **Arabic**.
- Generated documentation under `docs/09-agent-knowledge/generated/` is overwrite-only via `npm run docs:generate` (never edited by hand).
