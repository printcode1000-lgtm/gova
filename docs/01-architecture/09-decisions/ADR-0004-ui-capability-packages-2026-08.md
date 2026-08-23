# ADR-0004: UI Capability Packages (2026-08)

## Status

Accepted (2026-08)

## Context

UI-adjacent capabilities (hero slider, featured marquee, trending ribbon, page snapshot) mixed contracts, validation, and server policy with React components across `src/features/` and `data-core`.

## Decision

Seal **contracts and policy** in four packages; keep **React/Next components** in application:

| Package | Owns | Stays in app |
|---|---|---|
| `@asol/hero-slider-core` | Slider contract, validation, cache IDs, image-key diffing | `HeroSlider`, editors |
| `@asol/featured-marquee-core` | Product-list contract, save policy | `FeaturedMarquee`, product lookups |
| `@asol/trending-ribbon-core` | Ticker contract, payload guards | `TrendingRibbon`, form state |
| `@asol/page-snapshot-core` | Snapshot policy, DOM capture/restore | `SnapshotProvider`, hooks |

Packages declare ports; app injects auth, storage, `AsolDB`, `buildId`.

## Consequences

- Positive: Stable contracts testable without React; UI free to change rendering
- Negative: Agents must know split — component vs core package
- Pattern reusable for future UI-adjacent capabilities

## Source Map

- Registry: four entries in `capability-registry.ts`

## Related Documents

- [Package Creation Rules](../02-packages/package-creation-rules.md)
- [Application Layers](../10-application-layers/ui-layer.md)

## Change Impact

Moving React into these packages is forbidden — would invert dependency direction.

## Invariants

UI capability packages MUST NOT import `@/` or React components from app.
