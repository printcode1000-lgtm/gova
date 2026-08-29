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

## Verification

Run:

```bash
npm run test:profile-preview-responsive
```

Use browser viewport checks for the live page when validating production-only
layout reports, then keep the regression test in place to protect the source
classes that make the preview responsive.
