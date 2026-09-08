# Product search fields port not configured

## Symptom

`GET /api/search/products` returns HTTP 500 from an isolated service while `/api/health` remains 200. The response contains one of:

- `dataCoreProductSearchFields: getDefaultProductSearchFieldKeys is not configured`
- `dataCoreProductSearchFields: getProductSearchFieldByKey is not configured`

## Cause

`@asol/data-core` resolves product-search field metadata through a runtime port. The main application registers it during instrumentation, but isolated Vercel services do not run the application's instrumentation. A search-owning composition root must register that metadata explicitly.

## Required wiring

`submain` and `products` import `registerDataCoreProductSearchFieldsPort` from `src/features/product-search/server/services/product-search-fields.server.ts` and invoke it at module load, alongside their runtime-config and specialty-catalog registrations. Keeping the registrar beside the existing search-field server module preserves the narrow service-mirror graph.

Do not fix mirror failures by adding unrelated browser, React Query, or Capacitor dependencies to an isolated service. If `services:sync` starts requesting those packages, the import graph has become too broad and should be narrowed instead.

## Verification

Run `npm run services:sync`, `npm run test:submain-composition`, `npm run test:products-composition`, `npm run test:data-core`, `npm run architecture:check`, `npm run runtime:check`, and `npm run docs:ci`. A direct search through the local `submain` composition should no longer throw a `dataCoreProductSearchFields` configuration error.
