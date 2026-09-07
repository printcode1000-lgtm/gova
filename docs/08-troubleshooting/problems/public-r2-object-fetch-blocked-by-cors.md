# Public R2 object opens directly but browser fetch is blocked by CORS

## Symptom

A Cloudflare R2 image URL returns `200` when opened directly or requested with `curl`, but Gova shows a transparent image placeholder. The server and Internet can both be healthy.

This is especially visible in product cards and Featured Marquee because the local-first image path downloads the remote object as a `Blob` before rendering it.

## Root cause

A public R2 URL being readable is not the same as being readable by browser JavaScript. Browser `fetch()` requires the bucket response to satisfy CORS. If `Access-Control-Allow-Origin` is absent, the browser blocks the response even when R2 returned `200`.

Gova deliberately fails closed here:

```text
Memory → AsolDB imageCache → R2 fetch → local transparent placeholder on unrecoverable failure
```

It must not fall back to rendering the original HTTP URL, because that would bypass the local-first cache contract.

## 2026-09-07 incident

The legacy product bucket `gova-storage` served the Featured Marquee product image successfully to direct requests but did not return CORS headers for the browser origin. `npm run r2:sync:cors` restored the project policy. After repair, browser-like `HEAD`, `OPTIONS`, and conditional requests returned the required CORS headers; `304 Not Modified` also preserved them.

## Repair

```bash
npm run r2:sync:cors
npm run r2:verify:cors
```

The sync applies the canonical policy to every storage account registered by `@asol/storage-core`. The verifier reads the live Cloudflare bucket configuration and, when an object exists, sends a real browser-style preflight to its public URL.

For OTA storage use:

```bash
npm run ota:sync:cors
npm run ota:verify:cors
```

## Recurrence prevention

`npm run cors:verify:live` verifies all eight deployed API origins and every registered browser-facing storage bucket. Both `deploy:push` variants run this check before any git write, including `deploy:push:fast`. `deploy:all` carries the same check as a preflight branch. OTA publish/check has its own mandatory `ota:verify:cors` gate.

An invalid or missing Cloudflare credential is a failure, not a warning. A bucket that cannot be verified is therefore unable to pass a release merely because it is currently empty.

## Diagnostic rule

Do not diagnose this as “no Internet” from the HTTP status alone. Check the browser contract:

- `Access-Control-Allow-Origin` permits the caller.
- `Access-Control-Allow-Methods` includes the requested method.
- `Access-Control-Allow-Headers` permits conditional/cache headers such as `If-None-Match`.
- A successful preflight is normally `204` **with** the CORS headers. A bare `204` still fails in the browser.

## Related

- [R2 Storage](../../02-data-and-storage/image-storage/r2-storage.md)
- [`@asol/cors`](../../05-platform-features/sealed-packages/cors-module.md)
- [Preflight answered without CORS headers](./preflight-answered-without-cors-headers.md)
