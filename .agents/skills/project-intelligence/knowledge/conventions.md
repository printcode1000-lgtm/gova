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

## 3. UI Attribute System & UID-First UiRegistry

- **Sole Source of Truth (`data-ui-uid`)**: Every registered page, region, action, field, item, and shared component instance must declare an immutable `data-ui-uid` (`<prefix>-<Base62-suffix>`).
- **One-Time Minting**: The Base62 suffix (6 characters, at least 1 uppercase and 1 digit) is minted once during development and hardcoded into source. Never generate UIDs on a render path.
- **Per-Instance Registration**: Shared primitives (`Button`, `Input`, `Select`, `Textarea`, `Switch`, etc.) never declare internal fallback UIDs. The usage site passes an explicit `ui?: UiDescriptor` prop.
- **Unregistered Fallback**: Elements without stable identities emit only `data-ui-component` and remain deliberately unregistered until addressed via the pending queue.
- **Enforcement**: Guarded by `packages/architecture-core/src/tests/ui-attribute-guard.test.ts` and `npm run test:ui-registry-core`.

---

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
  - `npm run ui-registry:pending:check`: Preflight verification that no open UiRegistry pending requests remain.
  - `npm test` / `test:*-core`: Package unit and contract tests.
- **Git workflow**: `main` is the only active development and release branch.

---

## 7. Communication & Documentation Conventions

- All project documentation inside `docs/` is in **English**.
- User communication by agents in this repository is strictly in **Arabic**.
- Generated documentation under `docs/09-agent-knowledge/generated/` is overwrite-only via `npm run docs:generate` (never edited by hand).
