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
- fall back to a different DOM element, generic form, semantic-label search, alternate selector, mock handler, fake response, or substitute data path when the declared real target is missing;
- silently coerce invalid simulation data into a shape that the real application would accept;
- bypass validation, authentication, authorization, Page Save, storage, API, database, or other mandatory gateways used by real users.

If the real target or real code path cannot be executed, the simulation must fail loudly. The fix is to correct the registry, instrumentation, test data, or real application integration — never to add a compatibility layer.

## Allowed Simulation Infrastructure

Simulation may contain orchestration and transport adapters whose only responsibility is to invoke the real application surface, for example loading the real page in a same-origin iframe and dispatching the native event on the exact declared element. Such infrastructure must not contain application/business decisions or alternate behavior.

`data-simulation-event` attributes are instrumentation only. They identify the exact real interactive element or form; they do not authorize a second implementation of the action.

## Test Data and Guards

Simulation identities and fixtures must satisfy the same canonical validation and normalization functions used for real users. Tests and guards must import and execute those canonical functions or services; they must not duplicate their regexes, constants, or conditions inside simulation code.

When a shared rule changes, simulation must inherit the change automatically through the same source. A change that requires editing both the real-user rule and a duplicated simulation rule is a contract violation.

## Enforcement Expectation

Any review, test, or agent working on simulation must treat duplicated production logic or a compatibility fallback as a defect. Remove the duplicate/fallback and route execution through the real owner instead.

## Related

- [User Simulation and E2E](../../06-super-admin-and-operations/user-simulation-and-e2e.md)
- [Module Isolation Rules](../../01-architecture/02-packages/module-isolation-rules.md)
- [Mandatory Gateways](../../01-architecture/05-capability-enforcement/mandatory-gateways.md)
