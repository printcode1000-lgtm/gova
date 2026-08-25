# User Simulation and E2E

## Purpose

`@asol/simulation-core` owns the user-page registry, interaction contracts,
runtime classification, fixed simulation identities, random internal-image
selection, execution progress, and discovery guard. The Super Admin surface is
available at `/super-admin/simulation`.

## Super Admin execution surface

`/super-admin/simulation` is the single primary control surface for page-level
simulation. It keeps page selection, interaction selection, execution, and E2E
progress on the same screen:

- The page selector lists every entry in `USER_PAGE_REGISTRY`.
- The interaction selector lists the real user interactions declared for the
  currently selected page.
- `SimulationProgressPanel` is one shared execution monitor. It is not a
  selector and shows the current or most recent E2E execution progress.
- The Run button executes the selected interaction in place without navigating
  to a page-specific simulation screen.
- Page and interaction selection are locked while an execution is active so
  the shared progress monitor always describes one stable run.

## Boundaries

- Discovery, execution, and presentation are separate modules.
- The page simulator loads the real application page in a non-visible,
  same-origin frame and dispatches the declared user action there. It does not
  render a copy of the original page UI.
- The existing application handlers, hooks, services, APIs, repositories,
  database backend, and storage configuration remain authoritative.
- Static Out, Android, and iOS use the configured remote Business API. They do
  not assume that App Router handlers exist in the static bundle.
- Scenarios are intentionally empty in version one. A page interaction remains
  a single page-bound event; a future scenario may coordinate multiple users,
  pages, and roles.

## Simulation Users

The protected bootstrap endpoint creates or verifies the nine fixed buyer,
seller, and delivery identities through the real authentication and profile
services. It is idempotent for accounts whose configured password still
matches. Existing accounts with different credentials are reported as real
failures rather than overwritten.

The Super Admin user-status cards also show the profile setup applied during
bootstrap: seller accounts receive one valid main category plus one valid
sub-category, while delivery accounts receive the delivery-services category.

## Internal Images

Image-requiring adapters must build their candidate pool from main or child
catalog image paths and call `pickRandomSimulationImage` or
`pickRandomSimulationImages`. Empty pools fail explicitly; no external test
asset fallback is permitted.

## Coverage Guard

`npm run simulation:coverage` compares the real non-development,
non-Super-Admin App Router pages with `USER_PAGE_REGISTRY`. It also follows each
page's local import graph and fingerprints interactive sources. New, removed,
moved, or changed pages and interactions fail with a drift error.

The guard runs as its own `deploy:all` preflight branch. It does not execute all
operational E2E interactions during deployment. When an intentional interaction
changes, update the corresponding event registry first, then run
`npm run simulation:discovery:update` to refresh the baseline.
