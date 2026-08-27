# Touch Interaction Policy

ASOL ships as a Capacitor application. Every real user session happens on a
touch screen, where no pointer can hover. This document is the binding rule for
interaction styling across the whole codebase.

## Rules

| Concern | Rule |
| --- | --- |
| `hover:` / `group-hover:` Tailwind variants | Forbidden. Zero occurrences allowed in `src/` and `packages/`. |
| CSS `:hover` selectors | Forbidden. Use `:active` when press feedback is wanted. |
| `cursor-pointer` / `cursor: pointer` | Forbidden. There is no cursor on a touch screen. |
| `active:` / CSS `:active` | **Required** wherever a control needs feedback. This is the only honest touch response. |
| `focus-visible:` / CSS `:focus-visible` | **Kept.** It never fires on touch, and it keeps keyboard and accessibility navigation usable. |
| `focus:` | Allowed only where the control is genuinely keyboard-driven (inputs). Prefer `focus-visible:`. |
| `transition-*` | Kept. Motion serves touch as much as it serves pointers. |
| `title` on a DOM element | Forbidden. It renders the browser hover tooltip, which no touch user can trigger. Use `aria-label`. A `title` **prop on a React component** is ordinary data and is allowed. |
| Text selection | **Always allowed, with no exception.** Every string the application paints must be copyable, everywhere, including inside buttons, menu items, badges and rows. |
| `select-none` / `user-select: none` / `-webkit-touch-callout: none` | Forbidden. They are the only ways text stops being copyable, so they are gone from the codebase. |
| `draggable` on an element carrying text | Forbidden. HTML drag-and-drop claims the gesture and the text underneath stops being selectable. Put `draggable` on the drag handle alone, marked `data-drag-handle`. |

A control that previously communicated its interactivity only through hover must
be given an `active:` state instead — never left with no feedback at all.

## Browser Chrome Neutralized

`src/app/globals.css` carries a **Touch-only interaction baseline** block that
removes the desktop affordances the browser adds by itself:

- `-webkit-tap-highlight-color: transparent` on every element — no grey/blue tap
  flash on Android and iOS.
- `touch-action: manipulation` on `html` — removes the 300ms double-tap-zoom
  delay. (`AsolMap` overrides this locally with `pan-x pan-y`, which the map
  gestures require.)
- `-webkit-text-size-adjust: 100%` — the OS must not rescale text on rotation.
- `overscroll-behavior-y: none` on `body` — no browser pull-to-refresh or
  rubber-band chaining behind the application shell.
- `user-select: text` + `-webkit-touch-callout: default` on `html` — text
  selection is inherited by every element and is never taken away (see
  [Copyable Text](#copyable-text)).
- Scrollbars hidden (`scrollbar-width: none` and a zero-size
  `::-webkit-scrollbar`) — scrolling itself is untouched; only the desktop
  gutter is gone.

## Copyable Text

Every string the application paints must be selectable and copyable — order
numbers, tracking codes, error identifiers, product names, prices, ids, labels
inside buttons and menu items. There is no exemption, and no opt-in class: the
baseline in `globals.css` grants selection on `html` and nothing takes it away.

The rule is stated positively because the failure mode is silent. A user who
cannot copy an id has no way to tell whether the application forbade it or the
gesture simply missed; they retype the value by hand, or they abandon it.

Two consequences are accepted deliberately:

- A long press on a control may start a text selection, or open the OS callout on
  iOS. Copyability is worth more than a perfectly clean press.
- Dragging inside a menu, a carousel or a marquee may select text. Where a
  horizontal gesture must keep working, constrain it with `touch-action`
  (`touch-pan-y` / `touch-pan-x`), never by suppressing selection.

`.asol-selectable` no longer exists. It was an opt-in for a default that is now
universal, and any new occurrence is a regression.

### Reordering by drag

`draggable` hands the element's whole surface to HTML drag-and-drop, so the text
inside it stops being selectable. A reorderable row therefore carries the
`draggable` attribute on its grab handle only — an icon-sized element with no
text of its own, marked `data-drag-handle` so the build gate can recognize it —
while the row keeps the `onDragOver` / `onDragEnd` drop handling.

### Wide tables, given that the scrollbar is gone

Hiding the scrollbar removes the only signal a desktop page gives that content
continues past the right edge. On a phone that signal was never there to begin
with — a horizontal drag is discovered by trying it — but it does mean a table
that overflows badly reads as a table that is simply cut off.

So a wide table must be wide *by design*, not by accident:

- `overflow-x-auto` on the wrapper and `min-w-[…]` on the table declares the width
  the table is allowed to scroll to.
- `min-w` does not stop cells from pushing past it. A single unbroken token — an
  account id, an S3 endpoint, a bucket URL — will widen a column until it fits,
  and no `min-w` prevents it. Pair it with `break-words` on cells (`[&_td]:break-words`)
  so the declared width is the real one.
- Scale the grid rather than the content: `p-2 sm:p-3` on cells and
  `text-xs sm:text-sm` on the table. Twelve pixels of padding per side costs
  24px per column, which on a five-column table is a fifth of a phone's width
  spent on gutters.

`/dev/cloud-accounts` is the worked example. Its tables carried 30–50
character ids and `r2.dev` URLs with no `break-words`, so each one laid itself out
around 2000px wide against a declared `min-w-[640px]`, and the horizontal drag was
the only way to reach any column but the first.

ASCII diagrams are the exception: they must not wrap, so they keep
`overflow-x-auto` and scroll. Scale their type down instead.

## Hover Tooltips

The browser paints its own tooltip for any DOM element carrying a `title`
attribute, and it appears only on pointer hover. On a touch device the text is
unreachable — the label is effectively invisible to every real user.

Every such attribute has been converted to `aria-label`, which delivers the same
string to screen readers and to accessibility tooling without a tooltip. Where a
label must be *seen*, render it as actual content (a caption, a helper line, a
sheet) rather than hiding it behind a hover.

Component props named `title` are untouched: `<ProductComponentFrame title={...}>`
passes data to a component that renders it as a heading; it never becomes a DOM
attribute.

## Toggle switches

Use `@/shared/ui/switch` (`Switch`) for every on/off control. It is the single
touch-sized pill (`h-8 w-14`) with RTL-aware thumb motion (`inset-inline-start`).
`@/shared/ui/toggle-switch` (`ToggleSwitch`) is a thin wrapper that adds a
required `aria-label` when no visible label is wired with `htmlFor`. Do not
reintroduce smaller Radix defaults or pointer-based `translate-x` thumb motion.

## Enforcement

The policy is a build gate, not a review convention. `packages/architecture-core/src/checks/touch-interaction-contract.ts`
scans every `.ts`, `.tsx`, and `.css` file under `src/` and `packages/` and fails
`npm run architecture:check` on any `hover:` variant (including `group-hover:` /
`peer-hover:` and prefixed forms such as `dark:hover:`), any CSS `:hover`
selector, and any `cursor-pointer` / `cursor: pointer`.
It also fails on a `title` attribute placed on a lowercase (DOM) JSX tag,
keying on the case of the nearest opening tag so component props keep working.

The same check enforces copyable text: it fails on `user-select: none` (and its
`userSelect` / `-webkit-` spellings), on `-webkit-touch-callout: none`, on the
Tailwind `select-none` class wherever a line reads as styling (`className`,
`class=`, `cn(`, `@apply` — so `select-none` as a "deselect all" action id is
untouched), and on any `draggable` attribute that is not on an element marked
`data-drag-handle` (`draggable={false}` is the opposite of the problem and is
left alone).

There are no exemptions — `/dev` tooling pages are held to the same rule so the
guard never needs an allowlist that can quietly grow.

## Verification

```powershell
npm run architecture:check
npm run typecheck
npm run lint
```

## Related

- [Theme System](theme-system.md)
- [App Sidebar Navigation](app-sidebar-navigation.md)
