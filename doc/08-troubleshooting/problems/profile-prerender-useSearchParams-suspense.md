# /profile prerender failure — useSearchParams without Suspense

**Date:** 2026-06-27  
**Environment:** Vercel Production / `npm run build`  
**Solution Status:** Resolved

---

## Symptoms

```
? useSearchParams() should be wrapped in a suspense boundary at page "/profile"
Error occurred prerendering page "/profile"
Export encountered an error on /profile/page: /profile, exiting the build.
```

---

## Cause

The `/profile` page was calling `useSearchParams()` directly inside `page.tsx` to read `?mode=edit`.

In Next.js 13+, any page that is statically generated (prerender) and contains `useSearchParams()` must have the call inside a child component wrapped in `<Suspense>`. Without this, the build fails.

The `/registration` page already followed this pattern; `/profile` did not.

---

## Solution

1. Move page logic to `src/components/profile/ProfilePageContent.tsx` (contains `useSearchParams`).
2. Make `src/app/profile/page.tsx` a thin wrapper:

```tsx
<Suspense fallback={<ProfilePageFallback />}>
  <ProfilePageContent />
</Suspense>
```

Same pattern used in `src/app/registration/page.tsx`.

---

## Prevention

When adding `useSearchParams()` to any page:

- Do not place it directly in `page.tsx` if the page is statically built.
- Place the logic in a child component and wrap it with `Suspense` with an appropriate fallback.

---

## Related Files

- `src/app/profile/page.tsx`
- `src/components/profile/ProfilePageContent.tsx`
- `src/app/registration/page.tsx` (reference for correct pattern)
