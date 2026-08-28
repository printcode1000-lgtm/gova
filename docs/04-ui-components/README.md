# UI Components Domain

## Purpose

Canonical UI behavior and interaction policies shared across pages and features.

## Read First

- [Touch Interaction Policy](./touch-interaction-policy.md) — binding touch-first interaction rules.
- [UI Attribute System](./ui-attribute-system.md) — typed page and component diagnostic identities.
- [Page Snapshot System](./page-snapshot-system.md) — required top-level page snapshot behavior.
- [Profile Edit Navigation](./profile-edit-navigation.md) — direct profile-section selection, active-tab synchronization, and snapshot restoration rules.
- [Theme System](./theme-system.md) — shared visual/theme rules.
- [App Sidebar Navigation](./app-sidebar-navigation.md) — application navigation behavior.
- [Category Tabs Strip](./category-tabs-strip.md) — the shared horizontal catalog tab strip and its consumers.
- `guides/` — focused implementation guidance.

## Invariants

UI remains touch-first: no hover-only behavior, pointer-cursor affordances, or inaccessible DOM title tooltips. Top-level page surfaces must preserve the page-snapshot contract. Presentation code must not bypass application services, repositories, or sealed package boundaries.

## Change Impact

A UI change can affect shared pages, accessibility, static mobile bundles, translation, theme, snapshots, and feature contracts. Run a context pack for the exact component/page and review its routes, owners, consumers, and tests before editing.
