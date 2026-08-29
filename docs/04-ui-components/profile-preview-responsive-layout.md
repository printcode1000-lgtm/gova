# Profile Preview Responsive Layout

## Purpose

`/profile?mode=preview` must stay within the viewport on production web, static
exports, and mobile shells even when seller-controlled text is long.

## Layout Contract

- The preview root owns horizontal containment with `min-w-0` and
  `overflow-x-clip`.
- Primary profile action tiles render as a two-column grid on the narrowest
  screens, expand to three columns from 360px, and return to the normal wrapping
  action row on `sm` and larger screens.
- Repeated profile sections, product cards, seller offers, working hours,
  fulfillment details, story text, and reviews must keep `min-w-0` on grid/flex
  children that can receive dynamic content.
- Seller-provided prose, coupon codes, carrier labels, product names, review
  names, comments, replies, and policy notes must wrap inside their containers
  instead of forcing page-level horizontal scroll.

## RTL and Mobile Failure Mode

The Chrome-only mobile failure that this document guards against can look like a
large blank column on the left with only a thin slice of profile content visible
on the right. The page-level `scrollWidth` may still appear equal to the
viewport, so do not stop at a scrollbar check. Inspect fixed and translated
panels too.

The root cause found in Chrome was a closed RTL sidebar drawer that was still
partly inside the viewport on some mobile widths. The profile content itself
also needed stronger `min-w-0` and wrapping guarantees so seller-controlled
content cannot stretch grid or flex containers.

When testing this route on mobile, verify all of the following:

- `document.documentElement.scrollWidth` and `document.body.scrollWidth` match
  the viewport width.
- The main profile surface starts at the viewport edge and spans the viewport;
  it is not shifted to the side.
- Closed fixed drawers are clipped by their overlay wrapper and translated fully
  out of the visible viewport for the current text direction.
- Horizontally scrolling rails such as featured products or marquee content are
  inside an intentional clipped/scrollable container, not widening the page.

## Verification

Run:

```bash
npm run test:profile-preview-responsive
```

Use browser viewport checks for the live page when validating production-only
layout reports, then keep the regression test in place to protect the source
classes that make the preview responsive.
