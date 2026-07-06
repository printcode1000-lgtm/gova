# Hydration Mismatch in Splash Page Marquee

## Problem

During hydration of the splash page (`/`), Next.js (Turbopack) throws a hydration mismatch error:

```
Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client.
...
  <SplashPage>
    <Suspense fallback={null}>
      <SplashScreen displayCategories={[...]}>
        <main className="gova-splas..." dir="rtl">
          <TopMarquee displayCategories={[...]}>
            ...
              <MarqueeCard label="التقنية وا..." image={"/images/..."} isCenter={false}>
                ...
                  <img
+                   alt="التقنية والالكترونيات"
-                   alt="الحيوانات الأليفة"
```

---

## Root Cause

Inside `src/components/splash/TopMarquee.tsx`, the list of featured categories for the marquee loop was chosen randomly on each render:

```typescript
// Inside TopMarquee render function (runs on both Server and Client during hydration)
const selectedCategories = getRandomCategories(displayCategories, 6);
const loopItems = [...selectedCategories, ...selectedCategories];
```

Because `getRandomCategories` shuffles items inline using `Math.random()`, the server and the client generated different random orders. This resulted in mismatched attributes (`alt`, `src`, `srcSet`) and content (`{label}`) for `MarqueeCard` elements, triggering the Next.js hydration mismatch.

---

## Solution

To fix this, the random selection logic was deferred to run only on the client-side after mounting, leaving the initial render/SSR state stable:

1. **Stable Initial State:** The category list state is initialized with a stable slice of categories (`displayCategories.slice(0, 6)`), ensuring that the server-rendered HTML and the first client-side render match exactly.
2. **Post-Mount Shuffling:** A `useEffect` hook shuffles the categories after mounting on the client, updating the state and triggering a smooth transition/re-render.

```typescript
const [selectedCategories, setSelectedCategories] = useState<CategoryDisplay[]>(() =>
  displayCategories.slice(0, 6)
);

useEffect(() => {
  setSelectedCategories(getRandomCategories(displayCategories, 6));
}, [displayCategories]);

const loopItems = [...selectedCategories, ...selectedCategories];
```

---

## Related Files

- `src/components/splash/TopMarquee.tsx` (Fixed selection logic)
