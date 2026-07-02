# OTA publish and static export failures

**Date:** 2026-07-01 to 2026-07-02  
**Environment:** Windows, PowerShell, VS Code/Devin debugger, Next.js static export, Capacitor OTA  
**Solution Status:** Resolved

## Summary

`npm run ota:publish` failed at several guarded stages as new runtime assets and pages were introduced. No remote manifest was published during failed attempts because the manifest is written only after a successful build and completed file operations.

The final successful publication was OTA version `0.1.21`.

## 1. subcategories.json missing during type checking

### Symptom

```text
Cannot find module '../../../../public/catagory/subcategories.json'
```

### Cause

The static policy excluded `public/catagory/subcategories.json`, but server-only profile schema code imported that exact file while Next.js type-checked the temporary build tree.

### Solution

The file was ultimately classified as a normal runtime asset in `STATIC_PUBLIC_ALLOW_FILES`, exactly like `categories.json`. It is available during compilation, copied to `out`, included in the OTA manifest, and published to R2.

### Related files

- `scripts/build-static.ts`
- `src/features/profile/repositories/specialty-columns.server.ts`
- `doc/capacitor/static-export-policy.md`

## 2. Debugger inheritance and temporary-directory lock

### Symptoms

```text
Debugger attached.
Waiting for the debugger to disconnect...
EPERM, Permission denied: .tmp-static-build
```

PowerShell also reported a PSReadLine cursor-position exception while rendering the long injected debug command.

### Cause

VS Code/Devin injected `NODE_OPTIONS` and `VSCODE_INSPECTOR_OPTIONS`. Every nested npm, Next.js, and Capacitor process inherited the debugger bootloader. Attached workers kept `.tmp-static-build` locked during cleanup.

### Solution

`scripts/child-process-env.ts` removes VS debugger injection from child-process environments. `build-static.ts` also retries temporary-directory deletion five times with a 200 ms delay.

### Related files

- `scripts/child-process-env.ts`
- `scripts/build-static.ts`
- `scripts/ota-publish.ts`
- `scripts/cap-build.ts`

## 3. New public assets were unclassified

### Symptom

```text
Unclassified public assets. Add each path to the static allowlist or ignorelist:
catagory/cars/data/body_types.json
catagory/cars/imgs/...
product/style/index.json
```

### Cause

The static policy deliberately rejects new public files until they are reviewed. Vehicle catalogs/images and product-style definitions were added without policy entries.

### Investigation

Both directories are runtime-owned:

- `ProductVehicleSpecs.tsx` loads `catagory/cars/data/*.json` and `catagory/cars/imgs/*`.
- `ProductPageContent.tsx` loads `product/style/<main>__<sub>.json`.

### Solution

These directories were added to `STATIC_PUBLIC_ALLOW_DIRECTORIES`:

```text
catagory/cars
product/style
```

### Prevention

Search direct and dynamically constructed paths before classification. Add a complete directory only when external runtime data may reference any child. Never bypass the unclassified-file guard.

## 4. Dynamic category route lacked static parameters

### Symptom

```text
Page "/categories/[categoryId]" is missing "generateStaticParams()"
```

### Cause

Next.js `output: export` cannot produce an arbitrary dynamic route. Supported parameter values must be known during the build.

### Solution

`src/app/categories/[categoryId]/page.tsx` now exports `generateStaticParams()` from `public/catagory/categories.json`, producing one static page per category ID.

### Prevention

Every dynamic route included in static builds must export `generateStaticParams()` or be explicitly excluded from the temporary static route tree.

## 5. Server searchParams prevented static rendering

### Symptoms

```text
Route /categories/[categoryId] with dynamic = "error" couldn't be rendered statically
because it used await searchParams
```

The same error then appeared for `/product`.

### Cause

The server `page.tsx` files awaited `searchParams`, making their output request-dependent and incompatible with static export.

### Solution

For categories and products:

1. Keep `page.tsx` statically renderable.
2. Wrap the client content component in `Suspense`.
3. Read query values through `useSearchParams()` inside the client component.

Applied to:

- `CategorySubcategoriesPage` for `collection=1`.
- `ProductPageContent` for mode, product ID, main category, and subcategory.

### Related files

- `src/app/categories/[categoryId]/page.tsx`
- `src/components/categories/CategorySubcategoriesPage.tsx`
- `src/app/product/page.tsx`
- `src/components/product/ProductPageContent.tsx`

## Verification

The successful publication produced:

```text
OTA version: 0.1.21
Static pages: 33
Manifest files: 620
Published size: 9,436,537 bytes
Changed/new files: 444
Deleted files: 21
```

The route report included 17 generated category routes and a static `/product` page. Vehicle assets and product style definitions were present in the OTA inventory.
