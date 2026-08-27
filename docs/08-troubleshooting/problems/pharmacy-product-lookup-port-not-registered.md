# PharmacyProductLookupPort Is Not Registered

## Symptom

Requests fail with:

`PharmacyProductLookupPort is not registered`

On production web this appears as:

`[AsolApiClient] GET /api/products?uid=…&mainCategoryId=…&subcategoryId=… failed: internalServerError`

The products service (`asol-products`) returns that 500. The same query against
the main app can still return 200, because the browser service bridge sends
`GET /api/products` to the products account.

Local development can also throw the same message after a Turbopack reload.

## Cause

`productService.listByOwnerAndCategory` always calls
`getPharmacyProductLookupPort()`, even when the category pair is not a pharmacy
bucket. The getter throws if nothing registered the port.

Two composition roots must register it:

1. **Main app** — `registerServerApplicationPorts()` from instrumentation.
2. **Products service** — `@asol/products-composition` at module load. This
   account has no instrumentation, so skipping the registration leaves every
   browser product list as 500 while `/api/health` stays 200.

A second local-only cause: storing the port in module-local state. Next.js can
reload the port module without re-running instrumentation, which emptied the
binding. The registry now lives on `globalThis`.

## Fix

Call `registerPharmacyCatalogProductLookupPort()` from both the main-app server
application ports and the products composition root. Keep the port on
`globalThis`.

## Guard

- `src/features/product/tests/pharmacy-product-lookup-port-registry.test.ts`
  prevents module-local storage.
- `packages/products-composition/src/tests/index.test.ts` requires the products
  composition root to register the adapter.
