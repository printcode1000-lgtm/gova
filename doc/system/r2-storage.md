# Cloudflare R2 Storage

Account: `Bids.stories@gmail.com` · Bucket: `gova-storage` · Region: `WEUR`

## Env vars

See [data-layers/14-environment-variables.md](./data-layers/14-environment-variables.md).

Local secrets live in `.env.local` (gitignored). Template in `.env.example`.

## Code layout

| File | Purpose |
|------|---------|
| `src/core/provisioning/r2-platform-api.ts` | Cloudflare REST — CORS get/put/delete, token verify |
| `src/core/provisioning/r2-s3-client.ts` | S3-compatible upload, delete, list, presigned URLs |
| `src/core/provisioning/r2-cors-policy.ts` | Default CORS rules from `GOVA_CORS_ORIGINS` |
| `scripts/r2-sync-cors.ts` | Apply full browser CORS to bucket |

## Sync CORS

```bash
npm run r2:sync:cors
```

Applies `GET`, `PUT`, `POST`, `DELETE`, `HEAD` for all origins in `GOVA_CORS_ORIGINS` (defaults include `localhost:3000`).

## Public URLs

- **Public Dev URL:** `R2_PUBLIC_URL` / `NEXT_PUBLIC_R2_PUBLIC_URL`
- **S3 endpoint:** `R2_ENDPOINT` + bucket `gova-storage`
- **Custom Domain:** not configured yet

## Packages

- `@aws-sdk/client-s3` — S3-compatible object operations
- `@aws-sdk/s3-request-presigner` — presigned upload/download URLs

Cloudflare REST calls use `govaHttpFetch` (no extra SDK).
