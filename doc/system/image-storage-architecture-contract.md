# Mandatory Architecture Contract — Image Storage System

Non-negotiable rules for every developer, AI agent, feature, page, API, service, migration, or refactor.

Violations must be rejected. Enforced by `npm run architecture:check` and startup validation.

See implementation: `src/core/architecture/image-storage-contract.ts`, `src/core/storage/profiles/storage-profile-validator.ts`.

---

## 1. Single Upload Pipeline

```
UI → ImageStorageService → ImageStorageApiService → API → Application Layer
  → Storage Profile → Image Rules → Image Processing → Storage → Provider → Persistence
```

No layer may be skipped.

## 2. UI Contract

UI knows only `StorageProfileId` via `StorageProfiles.*`.

UI must never know: Provider, Cloudflare, Google Drive, Local Storage, Folder, Bucket, credentials, MaxImageSize, OutputFormat, ImageKey generation.

## 3–5. Storage Profiles

- Single source: `src/config/storage-profiles.json` (requires `version` + `profiles`)
- Each profile: `id`, `enabled`, `provider`, `folder`, `maxImageSizeKB`, `outputFormat`
- No code defaults — missing/invalid config fails startup

## 6–8. Processing, Format, ImageKey

- All uploads pass Image Processing (client compress + server rules validation)
- Output format from profile only — use `output-format.registry.ts`
- Keys only via `ImageKeyGenerator`

## 9–12. Providers

- Provider selection only in Storage Layer (`provider-resolver.server.ts`)
- Dev: `LocalStorageProvider` → `public/sync_data/sync_file/images/`
- Production: profile provider from JSON

## 13–22. Metadata, APIs, Forbidden Practices

- UI → `ImageStorageService` only (never API adapter directly)
- Server upload entry: `POST /api/storage/images/upload` → Application Layer
- No direct R2/filesystem/provider instantiation outside Provider Layer
- No duplicate upload/compression/validation logic
- Orphan cleanup: independent maintenance service only (future)

## Final Rule

The Image Storage System is the **only** authorized mechanism for image upload, processing, storage, retrieval, replacement, and deletion.
