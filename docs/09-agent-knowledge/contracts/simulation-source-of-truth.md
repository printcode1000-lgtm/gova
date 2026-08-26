# Simulation Source-of-Truth Contract

## Purpose

This is a binding project contract for every user simulation and E2E path. Simulation exists to exercise the application exactly as a real user does; it must never become a parallel implementation of application behavior.

## Mandatory Rule

**Simulation must use the exact same source code, exported functions, validation rules, services, API paths, repositories, handlers, and user-facing interaction paths used by real users.** If real-user behavior already has an owner, simulation must call that owner directly rather than reproduce its logic.

This rule is default-deny: a simulation-specific implementation is forbidden unless it is only transport/orchestration needed to invoke the real user path and contains no duplicated business rule.

## No Compatibility Layers

Compatibility layers, fallback behavior, permissive substitutes, and simulation-only business logic are forbidden. In particular, simulation must not:

- copy a regular expression, validator, normalizer, policy, permission rule, calculation, mapping, or business condition from production code;
- create a simulation-specific equivalent of a real service, hook, API operation, repository, or domain function;
- fall back to a different DOM element, generic form, semantic-label search, CSS selector, positional expression, mock handler, fake response, or substitute data path when the declared real target is missing;
- silently coerce invalid simulation data into a shape that the real application would accept;
- bypass validation, authentication, authorization, Page Save, storage, API, database, or other mandatory gateways used by real users.

If the real target or real code path cannot be executed, the simulation must fail loudly. The fix is to correct the registry, instrumentation, test data, or real application integration — never to add a compatibility layer.

Simulation must never be made shallower to keep a board green. Removing depth from an interaction so it stops reporting a problem is a compatibility layer by another name: it converts an unanswered question into a false answer.

## Unavailable Is A Reported State, Not A Pass

There is exactly one sanctioned alternative to failing, and it is not a softened failure. An interaction may declare the real state the page renders when the data it needs does not exist — an empty list, a missing record — through the same instrumentation contract as any other target. When a declared target is missing **and** that state is present, the run is reported `unavailable`.

This is bound by four rules:

- `unavailable` requires the application's own rendered state to say so. It must never be inferred from a timeout, a retry, an absent element, or a guess.
- The state is consulted only after a target has actually gone missing, so it can never mask a working path.
- A missing target with no such declared state remains an explicit failure.
- `unavailable` is not success. It must be visually and textually distinct from a pass, and excluded from error reports rather than from the record.

The remedy for a persistent `unavailable` is environment or identity data, never a fallback in the execution port and never a reduction in what the interaction exercises.

## Allowed Simulation Infrastructure

Simulation may contain orchestration and transport adapters whose only responsibility is to invoke the real application surface, for example loading the real page in a same-origin iframe and dispatching the native event on the exact declared element. Such infrastructure must not contain application/business decisions or alternate behavior.

## Typed Targets, Never Selectors

An interaction action declares a typed `SimulationTarget` — a `{ kind, id }` pair — and nothing else. Interaction definitions must never carry a CSS selector, an `aria-label`, a field name, a text match, or a positional expression. Only the execution port knows how a target reaches the DOM, through exactly one instrumentation attribute per kind:

| Kind | DOM attribute | Resolution |
|---|---|---|
| `event` | `data-simulation-target` | Exactly one element. |
| `field` | `data-simulation-field` | Exactly one real editable input, textarea, or select. |
| `file` | `data-simulation-file` | Exactly one real `<input type="file">`. |
| `list-item` | `data-simulation-list-item` | A repeated row of a real list; resolves to the first marked element in document order. |
| `state` | `data-simulation-state` | A real rendered state rather than a control, such as a page's own empty state. Probed for presence only, never acted on. |

For `event`, `field`, and `file`, a missing marker and a duplicated marker are both explicit failures. `list-item` is the one kind whose id is deliberately shared by every row of one real list, so first-in-document-order is the declared contract rather than a fallback search; a list marks every row instead of threading a positional index through the component tree.

These attributes are instrumentation only. They identify the exact real interactive element, field, list, or form; they never change rendering, never add behavior a real user does not have, and never authorize a second implementation of the action. When the real interaction runs through a shared gateway such as Page Save, the target belongs on that gateway's real control, never on a simulation-only button.

Instrumentation coverage is bounded by the registry: every declared target must have a real marker in application source, but an unregistered interactive element is not required to carry one. Adding coverage means registering the real interaction first, then marking its real element.

## Test Data and Guards

Simulation identities and fixtures must satisfy the same canonical validation and normalization functions used for real users. Tests and guards must import and execute those canonical functions or services; they must not duplicate their regexes, constants, or conditions inside simulation code.

When a shared rule changes, simulation must inherit the change automatically through the same source. A change that requires editing both the real-user rule and a duplicated simulation rule is a contract violation.

## Enforcement Expectation

Any review, test, or agent working on simulation must treat duplicated production logic or a compatibility fallback as a defect. Remove the duplicate/fallback and route execution through the real owner instead.

## Related

- [User Simulation and E2E](../../06-super-admin-and-operations/user-simulation-and-e2e.md)
- [Module Isolation Rules](../../01-architecture/02-packages/module-isolation-rules.md)
- [Mandatory Gateways](../../01-architecture/05-capability-enforcement/mandatory-gateways.md)
