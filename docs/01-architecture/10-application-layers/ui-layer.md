# UI Layer

## Purpose

Rules for presentation components and pages under `src/components/`, `src/app/`, and feature presentation folders.

## Scope

React/Next UI. Touch policy: [docs/04-ui-components/touch-interaction-policy.md](../../04-ui-components/touch-interaction-policy.md). Page snapshots: [docs/04-ui-components/page-snapshot-system.md](../../04-ui-components/page-snapshot-system.md).

## Responsibilities

- Render state from hooks
- Forward user events to hooks or callbacks
- Use `@asol/*` UI capability packages for domain contracts (hero slider, marquee, etc.) through props/adapters — not embedded domain logic

## May import

- Hooks (feature or shared)
- Shared UI components
- Browser-safe `@asol/*` doors (formatting, UI capabilities)
- `@asol/page-save-core` for page-authored persistence entry points (not direct DB)

## Must never import

- Repository modules
- `@asol/data-core/<domain>` server doors
- Drizzle, SQL drivers
- Server services or `server-only` modules
- Raw `fetch`

## Page-authored writes

All UI-initiated persistence MUST route through `@asol/page-save-core` — enforced by gateway contract and write-surface tests.

## Touch-only policy

Forbidden in UI: `hover:`, `cursor-pointer`, DOM `title` attribute. Use `active:` for press feedback. Enforced by `checkTouchInteractionContract`.

## UI vs UI capability packages

React components stay in app (ADR-0004). Packages like `@asol/hero-slider-core` own validation and policy; components own rendering.

## Source Map

- Page save: `@asol/page-save-core`, `src/features/page-save/`

## Related Documents

- [Hooks Layer](./hooks-layer.md)
- [ADR-0004](../09-decisions/ADR-0004-ui-capability-packages-2026-08.md)

## Change Impact

UI importing server layer fails architecture check and breaks static/client bundle.

## Invariants

Every top-level page adopts `PageSnapshotPage` (architecture:check contract).
