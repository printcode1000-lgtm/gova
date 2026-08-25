# PharmacyProductLookupPort Is Not Registered

## Symptom

Local development can intermittently throw:

`PharmacyProductLookupPort is not registered`

The application composition root did register the port earlier in the process.

## Cause

The port implementation was stored in module-local state. Next.js/Turbopack can reload the port module during development without rerunning the server instrumentation composition root. The reloaded module therefore recreated the port variable as empty.

## Fix

The registered `PharmacyProductLookupPort` is stored on `globalThis`, so it survives a module reload for the lifetime of the server process while production composition behavior remains unchanged.

## Guard

`src/features/product/tests/pharmacy-product-lookup-port-registry.test.ts` prevents the port from returning to module-local storage.
