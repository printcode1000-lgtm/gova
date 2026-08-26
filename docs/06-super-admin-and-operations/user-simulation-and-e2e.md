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
- The monitor keeps its title and copy controls fixed and scrolls its entries
  vertically inside a bounded region, so a Run All batch stays readable without
  pushing the rest of the control surface off screen.
- Page and interaction selection are locked while any execution is active so
  the shared progress monitor always describes one stable run.

## UiRegistry is the only source of simulation targets

`@asol/ui-registry-core` owns identity, interaction, value contracts, and the
generated target catalog. `@asol/simulation-core` consumes that package through
its public door and adds scenarios; the dependency never points the other way.

**Forbidden targeting.** Simulation may not resolve an element by a CSS
selector, a DOM index, text or a label, `data-ui-id`, `data-ui-component`, or a
`data-simulation-*` attribute. `architecture:check` fails on each of these with
the file, line, uid, route and reason.

**The generated registry.** `UI_SIMULATION_REGISTRY` is generated from the
descriptors that already exist in source plus `UI_PAGE_REGISTRY` — there is no
hand-maintained target list to drift. Regenerate it with
`npm run ui-registry:simulation:generate`; `architecture:check` fails when the
committed file differs from source. Its `routes` come from the import graph, so
they are a superset: a page that provably cannot render an element is rejected,
while a shell barrel can make an element look reachable from many routes.

**Compatibility.** `data-simulation-*` attributes are still emitted, by the
package builder only, with exactly the values they had before. The executor no
longer reads them; they remain for external consumers and for the discovery
scanner. Removing them is a separate, guarded change: the guard already refuses
any manual emission outside `@asol/ui-registry-core`, and the emitter is the one
place that would have to change.

**Lifecycle.** Deleting or renaming a registered element removes its uid from
the generated registry, so the scenario that named it fails at load with
`simulationTargetNotRegistered`, and `simulation:coverage` fails with the page,
interaction and reason. Adding a descriptor with `interaction` and `simulation`
makes it discoverable by coverage and by
`npm run ui-registry:simulation:report`, which prints route, uid, semantic id,
interaction, value contract, simulation id and the scenarios that reference it.

**Rule for new work.** Every new simulated UI element needs an explicit uid, an
explicit `interaction`, and a scenario that references its simulation id.

## Boundaries

- Discovery, execution, and presentation are separate modules.
- The page simulator loads the real application page in a non-visible,
  same-origin frame and dispatches the declared user action there. It does not
  render a copy of the original page UI.
- The execution driver may type into real editable fields, select the first real enabled option from an exact `<select>` target, dispatch real keyboard events, and wait for an exact asynchronously rendered target. These operations prepare real UI prerequisites; they are not fallback selector resolution.
- The existing application handlers, hooks, services, APIs, repositories,
  database backend, validation/normalization functions, and storage configuration remain authoritative.
- Interaction definitions carry registered UiRegistry uids, never CSS selectors. The execution port is the only module that knows how a target maps to a DOM attribute, and missing declared targets fail explicitly; it does not search for semantic or generic fallback targets. When a target also has a super-admin diagnostic identity, declare `simulation: { kind, id }` in its `UiDescriptor`; `@asol/ui-registry-core` owns that descriptor contract and emits the same execution marker, keeping both records synchronized. The dependency direction is one-way: `@asol/simulation-core` consumes `@asol/ui-registry-core` through its public door, and the UiRegistry package never imports simulation-core. The descriptor's `uid` is the identity **and** the locator; the simulation `id` remains a separate scenario name that resolves to exactly one uid.
- Static Out, Android, and iOS use the configured remote Business API. They do
  not assume that App Router handlers exist in the static bundle.
- Scenarios are intentionally empty in version one. A page interaction remains
  a single page-bound event; a future scenario may coordinate multiple users,
  pages, and roles.
- A state that requires an external secret or out-of-band challenge must not be pretended into existence by page simulation. Password recovery therefore covers requesting the real recovery code at page-interaction level; code verification and password reset belong to a future scenario only when the real delivered code can be obtained through its real channel.

## Interaction Targets

An interaction action addresses a registered element by its uid. Scenario
definitions never contain a CSS selector, an `aria-label`, a field name, or a
positional expression; they name a simulation id, which the generated registry
resolves to exactly one uid at load time:

| Registered field | What it is | Used for |
|---|---|---|
| `uid` | `data-ui-uid`, minted once per element | **The only locator.** The adapter queries `[data-ui-uid="…"]` and nothing else. |
| `id` | Semantic name (`cart-checkout`) | Diagnostics and reports. Never a locator. |
| `interaction.type` | `tap` / `type` / `select` / `toggle` / `upload` | Validated against the step before the DOM is touched. |
| `interaction.valueContract` | A named shape (`phone-number`, `quantity`, …) | Validates the value a scenario supplies. |
| `simulation.id` | Scenario/event name | How a scenario refers to the element; resolves to one uid. |
| `simulation.kind` | `event` / `field` / `list-item` / `file` / `state` | Preserved internally so each family keeps its previous resolution behaviour. |

A step is therefore `{ targetUid, interaction, value? }`. Before it runs, the
runner resolves the uid through the generated `UiSimulationRegistry`, checks the
page can render it, checks the requested interaction is the registered one, and
checks the value against the declared contract.

Multiplicity is a registry fact rather than an attribute choice: a descriptor
the registry marks `repeated` — a row rendered once per item of a real list —
resolves to the first match in document order, exactly as `list-item` did.
Everything else must match exactly once; zero or two matches is an explicit
failure that names the uid.

Instrumentation is addressing metadata only. It never changes rendering, never
adds a behavior the real user does not have, and never authorizes a second
implementation of an action. When the real interaction runs through a shared
gateway — Page Save, for example — the target belongs on that gateway's real
control, not on a simulation-only button.

Interaction discovery strips these markers before fingerprinting a page, so
adding or moving instrumentation is not by itself an interaction change.

## Prerequisite Paths

Some declared targets only exist after the user has already walked a real path:
a cart row needs something in the cart, a product action needs an opened
product, the Page Save button only renders once a real change is staged. An
interaction may therefore declare an `entryPath` — the real path it starts from
— and then navigate the same frame through real controls until its target
renders. The execution frame follows every real navigation, so a chain such as
search → open the first result → add to cart → open the cart is one interaction
made entirely of real user actions.

This is not seeded state and not a shortcut: every step is a real control on a
real page, and any missing step still fails loudly at the exact target it could
not reach. `entryPath` is omitted for an interaction whose target is already
present on the page itself.

Page Save is a two-step real gateway. The header button opens the dialog and the
dialog's Execute button runs the work, so a save interaction declares both;
stopping at the header button would report success without ever saving.

The frame is not torn down the moment the last action returns. A click that
submits an order comes back as soon as its handler fires, so the port waits for
the frame to stop completing network work first; disposing mid-request left the
server reading a truncated body and reporting a server fault for what was a
complete user action.

## Unavailable Is Not A Failure

An interaction may declare `unavailableWhen`: the real empty state the page
renders when the data it needs does not exist — an empty orders list, a catalog
with no sections, a conversation not on this device. Those states carry a
`data-simulation-state` marker, and the runner consults them **only after** a
target actually went missing, so the successful path costs nothing.

The run is then reported `unavailable` rather than `failed`, and it is excluded
from **Copy errors only**. The distinction is the point of the whole board:

- `failed` — the declared target was missing while the page had every reason to
  render it. A real defect.
- `unavailable` — the page itself says it has nothing to act on. The
  application is behaving correctly and the environment simply has no data.

`unavailable` is never inferred from a fallback search, a timeout, or a guess;
it requires the application's own rendered state to say so. A missing target
with no such marker stays an explicit failure. The fix for a persistent
`unavailable` is the environment or the identity data — never a shortcut in the
execution port, and never a shallower interaction that stops exercising the real
path.

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

`simulation:discovery:update` refuses to record a route whose interaction
sources changed while its event registry did not, because that normally means a
real interaction was added or removed without a matching simulation event. An
instrumentation-only migration — adding markers and the JSX reflow around them —
legitimately changes source text on routes whose events are unchanged; record it
with `npm run simulation:discovery:update -- --accept-source-drift`. The runtime
guard stays strict either way.
