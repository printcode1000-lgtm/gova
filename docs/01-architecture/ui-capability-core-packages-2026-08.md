# UI Capability Core Packages - 2026-08

Four UI-adjacent capabilities were split into sealed packages without moving
React components or application wiring into packages:

| Capability | Previous spread | New package | Why this package boundary |
| :-- | :-- | :-- | :-- |
| Home hero slider | Entity constants, Zod validation, server save policy, image cleanup, repository row types, cache keys and admin UI were split between `src/features/advertisements`, `src/components/ui`, API routes and `data-core`. | `@asol/hero-slider-core` | The package owns the slider contract, validation, cache IDs, interval policy, image-key diffing and server orchestration through ports. The UI components stay in `src/components/ui` because they depend on React/Next rendering and storage UI. |
| Featured marquee | Product ID contract, seed validation, interval clamping, admin authorization and runtime cache constants were split between feature files, API routes, hooks and `data-core`. | `@asol/featured-marquee-core` | The package owns the product-list contract and save policy. Product lookup and card rendering stay in the app because they depend on product APIs and the shared UI card component. |
| Trending ribbon | The label/item contract, cache validation, save validation and admin authorization were split between the hook, route and server service. | `@asol/trending-ribbon-core` | The package owns the ticker contract, runtime payload guard, interval policy and admin save service. The text-only UI and form state remain application code. |
| Page snapshot | Snapshot types, deterministic keys, DOM capture/restore, sensitive-field rules, TTL/build compatibility and IndexedDB persistence were in one app feature. | `@asol/page-snapshot-core` | The package owns the snapshot policy and browser DOM mechanics. The application injects `AsolDB` and `publicEnv.buildId` through a small adapter, while React hooks stay in the app because they depend on `next/navigation`, session state and `NativeCore`. |

## Doors

| Package | Runtime door | Server door |
| :-- | :-- | :-- |
| `@asol/hero-slider-core` | `.`, types, constants and schemas | `./server`, service factory and ports |
| `@asol/featured-marquee-core` | `.`, types, constants and schemas | `./server`, service factory and ports |
| `@asol/trending-ribbon-core` | `.`, types, constants, schemas and payload guards | `./server`, service factory and ports |
| `@asol/page-snapshot-core` | `.`, types, keying, DOM capture/restore and persistence runtime | none |

No package imports application code. The app adapters wire authentication,
storage, repositories, `AsolDB`, and build IDs into package ports.

## What intentionally stayed in the app

The React components stayed outside packages:

- `HeroSlider`, `HeroSliderEditor`, and `HeroSliderImagesEditor`
- `FeaturedMarquee`
- `TrendingRibbon`
- `SnapshotProvider`, `usePageSnapshot`, and `useSnapshotState`

Those files have application reasons to change: rendering conventions, Next
navigation, session state, storage image widgets, product lookups and native
app-state listeners. Moving them into packages would make the packages depend on
the app instead of isolating the stable capability contracts.
