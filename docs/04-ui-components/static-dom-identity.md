# Static DOM Identity

## Purpose

Static DOM Identity gives repository-authored JSX DOM elements a permanent HTML
`id` that can be audited by tooling without adding runtime work. The identity is
source-owned: React rendering, deployment, CSS edits, copy changes, file moves,
and refactors must not regenerate it.

## Coverage

The guard covers lowercase intrinsic JSX elements authored under `src/app`,
`src/features`, `src/shared`, and `packages`. This includes wrappers around
third-party components, shared UI primitives, application layouts, route pages,
forms, controls, text containers, tables, media elements, and other static DOM
declared in TSX source.

DOM produced internally by React, Next.js, browser internals, or third-party
components is not covered. Test fixtures, generated output, build output, and
dynamic collection DOM are also outside the static identity registry.

## Dynamic Exclusions

Elements returned from collection callbacks such as `.map()` and `.flatMap()`
are treated as dynamic repeated DOM and are excluded. Static DOM around the
collection remains covered:

```tsx
<section id="orders-list-section-a1b2c3">
  {orders.map((order) => (
    <article>{order.number}</article>
  ))}
</section>
```

The `<section>` is static and must keep its permanent ID. The `<article>` is
created per order and is not a Static DOM Identity.

Existing dynamic-data identities, such as a notification row ID derived from a
notification key, are not converted into static identities. They must not be
used to satisfy the static guard.

## Format

Static IDs use:

```text
<scope>-<semantic-name>-<stable6>
```

The value is lowercase kebab-case, human-readable, and ends with a permanent
six-character suffix. Once assigned, the value belongs to that source element.
Do not regenerate it for text edits, class changes, formatting, movement, or
route changes.

## Forbidden Generators

Static IDs must exist in source. Do not use `Math.random()`,
`crypto.randomUUID()`, `useId()`, `Date.now()`, `performance.now()`, array
indexes, database IDs, product IDs, or other runtime values to satisfy the
static identity requirement.

## Shared Components

Shared components are covered. A component that renders once in the application
shell may use a direct static ID. A reusable component that can render multiple
times must receive an explicit source-provided namespace or ID from its caller.
Accepted patterns are:

```tsx
<div id={id} />
<div id={props.id} />
<div id={`${elementScope}-card-root-a1b2c3`} />
```

The caller-provided value or scope must be semantic, stable, and written in
source. It must not come from runtime records or indexes. Dynamic-record
components remain excluded from the static registry when their DOM identity is
derived from the record being rendered.

## Registry

The registry lives at
`docs/04-ui-components/static-dom-identity-manifest.json`. It is generated from
the AST and records every current static identity with source path, line,
element name, semantic name, and identity kind. This generated audit manifest is
not the runtime-bound identity registry and must not be imported by runtime code.

Use:

```bash
npm run dom:id:check
```

to validate source IDs, duplicate IDs, format, forbidden generators, dynamic
exclusion behavior, and manifest drift.

Use:

```bash
npm run dom:id:write
```

only after reviewing an intentional source identity change. This updates the
manifest without changing runtime behavior.

## Adding Static DOM

When adding a static intrinsic JSX element, add the permanent ID in the same
edit. Preserve accessibility and anchor relationships such as `htmlFor`,
`aria-controls`, and fragment links. If an existing ID is externally referenced,
update all static references atomically or keep the existing behavior through a
stable constant.

`npm run architecture:check` invokes the guard, so missing static DOM identities
cannot pass the main project architecture gate.

## Runtime-bound registry

Static IDs that are consumed by the application shell or by runtime DOM lookups
have a separate source-of-truth registry at `src/shared/dom/identity/static-ids.json`.
Registered values must not be duplicated as string literals in allow-listed
source. Consumers import the registry and use its value directly.

The explicit source allow-list is `src/app`, `src/features`, `src/shared`, and
`packages`. `getElementById`, `querySelector`, and `querySelectorAll` references
to literal static IDs must be registered; dynamic record-derived selectors are
outside this contract. The guard also fails when a registry entry no longer
backs an allow-listed static DOM element, when registry values collide, or when
the app shell stops consuming the registry.

The app shell deliberately consumes the registry, so shell identifiers used as
cross-module DOM contracts have one source of truth. This registry is kept
small and runtime-bound; the generated documentation manifest remains the full
audit inventory for all static JSX identities.

A repeatable child may also use a conditionally present scope derived from the parent (for example, `id ? `${id}-child-<stable6>` : undefined`); the fallback must not create a second runtime identity.
