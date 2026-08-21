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
- `user-select: none` + `-webkit-touch-callout: none` on interactive elements
  (`button`, `a`, `label`, `summary`, and the `button`/`tab`/`menuitem`/`option`
  roles) — a long press must not start a text selection or open the OS callout.
  Inputs, textareas, `contenteditable`, and anything marked `.asol-selectable`
  opt back in to normal text selection.
- Scrollbars hidden (`scrollbar-width: none` and a zero-size
  `::-webkit-scrollbar`) — scrolling itself is untouched; only the desktop
  gutter is gone.

Add `.asol-selectable` to any element whose text the user must be able to copy
(order numbers, tracking codes, error identifiers).

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

Use `@/components/ui/switch` (`Switch`) for every on/off control. It is the single
touch-sized pill (`h-8 w-14`) with RTL-aware thumb motion (`inset-inline-start`).
`@/components/ui/toggle-switch` (`ToggleSwitch`) is a thin wrapper that adds a
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
