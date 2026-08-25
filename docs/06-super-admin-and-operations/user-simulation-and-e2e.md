# User Simulation and E2E

## Purpose

`@asol/simulation-core` owns the user-page registry, interaction contracts,
runtime classification, fixed simulation identities, random internal-image
selection, execution progress, and discovery guard. The Super Admin surface is
available at `/super-admin/simulation`.

The binding rule for all simulation implementation is [Simulation Source-of-Truth Contract](../09-agent-knowledge/contracts/simulation-source-of-truth.md). Simulation must execute the same code paths used by real users and must never add compatibility layers or duplicate production business logic.

## Super Admin execution surface

`/super-admin/simulation` is the single primary control surface for page-level
simulation. It keeps page selection, interaction selection, execution, and E2E
progress on the same screen:

- The page selector lists every entry in `USER_PAGE_REGISTRY`; each visible page title is paired with its short application route (for example, `البحث /search`) so the target is unambiguous.
- The control surface, page-specific simulation view, user-status cards, action rows, and progress monitor must remain responsive on narrow, medium, and wide screens without forcing two-column controls on phone-sized viewports or allowing long routes/errors to overflow their containers.
- The interaction selector lists the real user interactions declared for the
  currently selected page and is rebuilt when the selected page changes.
- `SimulationProgressPanel` is one shared execution monitor. It is not a
  selector and shows the current or most recent E2E execution progress.
- The per-event Run button executes the selected interaction in place without
  navigating to a page-specific simulation screen.
- The Run All button below the page selector executes every interaction for
  every registry page sequentially: all interactions for the first page, then
  all interactions for the next page, until the registry is exhausted.
- A failed interaction is recorded and does not abort the remaining batch. The
  monitor records the pass/fail state and the actual code error message for
  each failed interaction.
- During a batch, the shared monitor groups entries by page and keeps each page's
  real interactions in execution order with their step-level progress.
- The monitor Copy button copies the complete visible execution log, including
  page, interaction, pass/fail state, steps, and code error messages.
- The monitor **Copy errors only** button copies only failed entries using exactly
  the page label, interaction label, and actual error message. It works for both
  a single interaction and a Run All batch and omits successful runs and step logs.
- Page and interaction selection are locked while any execution is active so
  the shared progress monitor always describes one stable run.

## Boundaries

- Discovery, execution, and presentation are separate modules.
- The page simulator loads the real application page in a non-visible,
  same-origin frame and dispatches the declared user action there. It does not
  render a copy of the original page UI.
- The execution driver may type into real editable fields, select the first real enabled option from an exact `<select>` target, dispatch real keyboard events, and wait for an exact asynchronously rendered target. These operations prepare real UI prerequisites; they are not fallback selector resolution.
- The existing application handlers, hooks, services, APIs, repositories,
  database backend, validation/normalization functions, and storage configuration remain authoritative.
- Simulation selectors are exact instrumentation. Missing declared targets fail explicitly; the execution port does not search for semantic or generic fallback targets.
- Static Out, Android, and iOS use the configured remote Business API. They do
  not assume that App Router handlers exist in the static bundle.
- Scenarios are intentionally empty in version one. A page interaction remains
  a single page-bound event; a future scenario may coordinate multiple users,
  pages, and roles.
- A state that requires an external secret or out-of-band challenge must not be pretended into existence by page simulation. Password recovery therefore covers requesting the real recovery code at page-interaction level; code verification and password reset belong to a future scenario only when the real delivered code can be obtained through its real channel.

## Simulation Users

The protected bootstrap endpoint creates or verifies the nine fixed buyer,
seller, and delivery identities through the real authentication and profile
services. It is idempotent for accounts whose configured password still
matches. Existing accounts with different credentials are reported as real
failures rather than overwritten.

Simulation does not own a separate phone-number validator or normalizer. The identities pass through the same `@asol/auth-core` canonical Egyptian mobile-phone rule used by real registration, login, profile updates, and password recovery. Invalid simulation identity data must therefore fail through the real auth path rather than being repaired by simulation-specific logic.

The Super Admin user-status cards show the exact Arabic catalog names returned
by the same category objects used during bootstrap. Seller cards show the
selected main category name and selected sub-category name. Delivery cards show
the selected delivery-services category name. These values come from the
server bootstrap result rather than from static UI labels.

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
