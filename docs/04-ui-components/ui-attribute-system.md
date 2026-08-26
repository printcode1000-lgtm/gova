# UI Attribute System

## Purpose

`@asol/ui-registry-core` is the single owner of `UiRegistry`, the typed identity system for page and UI diagnostics. `data-ui-uid` is its **sole source of truth**: the canonical address used for search, inspection, diagnostics, future references, and developer conversation. `data-ui-id` stays descriptive semantic metadata and is never the primary identity. Neither ever exposes route values, user data, or secrets.

## Use

Import `uiAttributes` from `@asol/ui-registry-core` for a semantic action, field, item, region, or component. Every explicit descriptor must declare a `uid` plus the complete metadata that applies to it: `id`, `kind`, and — where applicable — `action`, `part`, `state`, and `simulation`. Do not pad a descriptor with placeholder values for metadata that does not apply. The helper validates every token and returns the complete DOM attribute set. Pass that descriptor to a shared primitive through its `ui` prop — `<Button ui={{ … }}>`, `<Input ui={{ … }}>` — so the identity belongs to the instance, not to the component. `uiComponentAttributes` stays inside a shared primitive as the unregistered fallback for instances that have no stable identity. Never write a `data-ui-*` attribute directly in JSX. When an element is addressed by real-user simulation, declare `simulation: { kind, id }` in the same descriptor; the helper emits the matching `data-simulation-*` marker.

`UI_PAGE_REGISTRY` inside `@asol/ui-registry-core` is the source of truth for every `src/app/**/page.tsx` route. `AppShell` applies the resolved page identity to its main surface; the splash route uses `UiPageBoundary`. Dynamic values are matched but never emitted.

## Public API and ownership

The package is sealed, metadata-only, and dependency-free. It has exactly one door, `@asol/ui-registry-core`, exporting the types `UiState`, `UiElementKind`, `UiSimulationTargetKind`, `UiSimulationTarget`, `UiDescriptor`, `UiPageDefinition`, `UiDataAttributes`, `UiUid`, and `UiUidRandom`; the constants `UI_UID_ATTRIBUTE` and `UI_UID_SUFFIX_LENGTH`; the uid validators `isUiUid`, `isUiUidPrefix`, `isUiUidSuffix`, `parseUiUid`, and `assertUiUid`; the development-only minting helpers `uiUidSuffix`, `createUiUid`, and `generateUiUid`; the builders `uiAttributes`, `uiComponentAttributes`, and `uiPageAttributes`; and the registry pair `UI_PAGE_REGISTRY` and `resolveUiPage`. Token validation, route matching, and simulation-marker generation are internal helpers and are intentionally not exported.

There is no second source of truth: `src/shared/ui` does not re-export the contract, there is no compatibility alias, and no runtime persistence layer holds UIDs. Consumers — `UiPageBoundary`, `AppShell`, `AppHeader`, `AppSidebar`, `BottomNavBar`, the shared UI primitives, the page-save surfaces, and the super-admin inspector — are thin React adapters that import the package door directly. React, Next.js, Node APIs, and every browser global stay outside the package; the minting helpers take an injected randomness source instead of reading one.

## UID

Every registered page, region, action, field, item, and explicitly registered shared control carries a `uid`: one immutable, globally unique registry address, emitted as `data-ui-uid` before every other generated attribute.

- **Syntax.** `<semantic prefix>-<Base62 suffix>`, for example `product-data-a8K3xP`. The prefix is lowercase dot/dash-separated metadata; the suffix is exactly six Base62 characters carrying at least one uppercase letter and at least one digit. Uppercase is allowed **only** in the suffix, and the whole value stays a safe DOM token. `isUiUid`, `parseUiUid`, and `assertUiUid` are the validators.
- **One-time generation.** The suffix is minted once, during development, with `generateUiUid(prefix, random)` (or `uiUidSuffix` plus `createUiUid`), written into source, and never changed afterwards. Never call these helpers on a render path: a uid produced at application runtime is not an identity.
- **Why a random suffix.** It makes a uid impossible to confuse with — or silently regenerate from — the element id. A value that merely repeats `id`, `page.<id>`, or `ui.<id>` is rejected by `architecture:check` as a deterministic copy.
- **Uniqueness.** No two UIDs may exist anywhere. Page registry entries, typed descriptor maps such as `Record<string, UiDescriptor>`, and explicit descriptor literals all share one namespace.
- **Stability.** A uid must survive translation, styling, DOM nesting, route parameter changes, and unrelated refactors.
- **Privacy.** A uid may never be derived from DOM position, route values, labels, user data, database identifiers, tokens, timestamps, or any other personal value. Like every UiRegistry attribute it is diagnostic metadata only.
- **UID, `data-ui-id`, and simulation.** The uid is the identity; `data-ui-id` describes the element semantically; `data-simulation-*` stays the execution address for real-user simulation. All three are emitted from the same descriptor onto the same element, so one touch reveals the identity, the semantics, and the simulation address together.
- **Per-instance registration is mandatory.** A uid identifies one rendered element, so it can never live inside a generic helper: `uiComponentAttributes`, `Button`, `Input`, `Select`, `Checkbox`, `Switch`, `Textarea`, `TabsTrigger`, and `RadioGroupItem` never declare one. Every shared primitive accepts a `ui?: UiDescriptor` prop, and the **usage site** supplies it with a unique uid plus `id`, `kind`, and the applicable `action`, `part`, `state`, and `simulation`.
- **Repeated lists.** A list rendered by `.map` gets one descriptor per entry, keyed by that entry's own stable domain id through a `Record<string, UiDescriptor>` map — the bottom-navigation tabs, the return-policy options, and the release-console tabs all work this way. Never derive an identity from an array index, a label, user-entered text, a route parameter, a phone number, a raw database id, a timestamp, a UUID, or anything generated at runtime.
- **Unregistered fallback elements.** An instance that cannot carry a stable source-defined identity — a row rendered from runtime data, or a generic wrapper that renders in many unrelated places — stays unregistered and emits only the `data-ui-component` marker. That is a deliberate state, not an omission: the inspector reports it as missing a uid, and inventing an unstable uid instead is forbidden.
- **Rule for new work.** Every future UiRegistry registration — page, descriptor, or new usage of a shared component — must include a freshly generated uid together with the complete applicable metadata. Adding a `<Button>`, `<Input>`, or any other shared primitive without an explicit `ui` descriptor is allowed only when the instance genuinely has no stable identity, and that choice is visible in the inspector.

## Contract

- `data-ui-uid` is the globally unique registry address, and the only identity to quote when referring to an element.
- `data-ui-page` and `data-ui-id` are descriptive logical identities, never resource values.
- `data-ui-component` identifies a shared primitive such as `button` or `input` and marks an unregistered fallback.
- `data-ui-state` only uses `idle`, `loading`, `success`, `error`, `empty`, or `disabled`.
- `data-simulation-*` remains the execution contract, and its source is the adjacent `UiDescriptor.simulation` declaration.
- Attributes are diagnostic metadata. Do not place PII, query values, labels from user content, session values, or tokens in them.

## Enforcement and verification

`npm run architecture:check` rejects missing page registrations, duplicate page identities, stale registry entries, registry entries without a uid, duplicate UIDs anywhere in registered UiRegistry sources, invalid uid syntax, UIDs that are deterministic copies of an id or page id, explicit descriptors without a uid — including descriptors held in a typed `Record<string, UiDescriptor>` and later spread — manual `data-ui-*` JSX including `data-ui-uid` outside the package, a uid declared inside a generic helper under `src/shared/ui/`, a uid computed from an index, key, or template instead of written as a literal, and descriptor drift where one `id` is described with a different uid, kind, action, or part at two usage sites. Unregistered generic component markers are never reported.

`npm run simulation:coverage` compares every typed simulation action with real UI instrumentation, including UiRegistry declarations; deleting or renaming an addressed element therefore fails before deployment instead of leaving a stale simulation record.

`npm run test:ui-registry-core` validates the Base62 suffix format, uid generation, rejection of deterministic id-derived UIDs, route coverage, identity and uid uniqueness across the page registry and the shell descriptors, uid-first emission as `data-ui-uid`, static-route precedence, redaction-safe dynamic matching, builder output, the simulation marker table, and the package's own browser-safe seal. It also proves the per-instance model: no generic helper under `src/shared/ui/` declares a uid, two instances of one shared component never share a uid, and repeated lists key their descriptors by domain id. An adversarial guard suite fails the build for every unsafe shape listed above. `npm run test:super-admin-ui-inspector` validates exact-element selection, the text-node fallback to the parent element, uid-first output, selection and outlining of unregistered elements, the Add to UiRegistry proposal, and the inspector controls' exclusion from selection. Both are `test:*` commands, so the generated `npm run test` gate runs them automatically and `deploy:all` runs that gate during preflight.

## Super-admin inspector

`SuperAdminUiAttributeInspector` is mounted once at the application root and renders only for a verified super-admin session. It behaves like a browser element picker.

**Selection.** A pointer selects the **exact** element it lands on — button, link, input, textarea, select, div, span, image, SVG, section, dialog, registered or not — never a nearest semantic ancestor. A text node has no attributes of its own, so it resolves to its parent element. That exact element is the one outlined. Capture-phase handling stops the touch from activating, submitting, navigating, or mutating it, and both the pointer and click handlers ignore the inspector's own controls, so those controls can neither select themselves nor fire the element beneath them. Disabling the inspector restores the selected element's previous inline outline values.

**Output.** The first line is always `data-ui-uid`, followed by the full safe attribute tree from the selected element up through its typed ancestors. `data-simulation-*` markers are included because they are registry-owned metadata. The output is copied through Native Core on every selection.

**Registered element.** The uid line shows the registered address; the attribute tree and its simulation markers are copied with it.

**Unregistered element.** The element is still selected, still outlined, and still copied; the first line reads `data-ui-uid=(missing)`, whatever safe metadata exists on that exact element is shown, and an **Add to UiRegistry** button appears in the panel.

**Add to UiRegistry.** The button copies a complete registration proposal, ready to paste into `uiAttributes({ … })` or a `UiDescriptor` map. It carries a newly minted uid in the required prefix-plus-suffix form, plus `id`, `kind`, and the `action`, `part`, `state`, and `simulation` values that can be inferred safely. Every value comes only from `data-ui-*` and `data-simulation-*` metadata the element already publishes — never from labels, text content, form values, URLs, route values, tokens, or any other page data. A field that cannot be derived safely is emitted as `TODO`. The button writes no source file, mutates neither the page nor the selected element, and persists nothing; like the toggle it is excluded from selection and follows the touch-only policy.

Shared shell regions and actions are registered with explicit identities such as `app.header.search`, `app.bottom-nav.orders`, `app.sidebar.close`, and `page-save.dialog.close`; generic component markers remain only as unregistered fallbacks.

## Runtime compatibility

The contract is browser-safe metadata: it works in Development and Web builds, stays in Static `out/`, and is therefore available to Android and iOS WebViews. UIDs are compile-time constants, so they add no API, server, or native dependency. The inspector's clipboard write is the only platform call, and it already goes through Native Core.
