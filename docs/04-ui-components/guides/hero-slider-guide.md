# HeroSlider Developer Guide

`HeroSlider` is the single reusable carousel component used throughout the project. Pages do not maintain separate slider implementations. Instead, they provide different configurations, persistence adapters, and editing modes to the same component.

## Source files

| Responsibility                      | File                                                        |
| ----------------------------------- | ----------------------------------------------------------- |
| Runtime contract, schemas and save policy | `packages/hero-slider-core/src`                            |
| Reusable component                  | `src/features/advertisements/presentation/HeroSlider.tsx`                          |
| Reusable component public props/types | `src/features/advertisements/presentation/hero-slider.types.ts`                   |
| Reusable component transition styling | `src/features/advertisements/presentation/hero-slider-styles.ts`                  |
| View-mode off-screen image probes   | `src/features/advertisements/presentation/HeroSliderImageProbe.tsx`                |
| Carousel slide filtering helpers    | `src/features/advertisements/presentation/hero-slider-model.ts`                    |
| Carousel UI helper tests            | `src/features/advertisements/presentation/hero-slider.test.ts`                     |
| Full administrative editor          | `src/features/advertisements/presentation/HeroSliderEditor.tsx`                    |
| Image-only profile editor           | `src/features/advertisements/presentation/HeroSliderImagesEditor.tsx`              |
| Home integration                    | `src/features/home/presentation/HomeScreen.tsx`                        |
| Home cache and synchronization      | `src/features/advertisements/presentation/hooks/use-home-hero-slider.ts` |
| Home save broadcast                 | `src/features/advertisements/application/home-hero-slider-sync.ts`      |
| Super-admin save (explicit publish) | `src/features/super-admin/presentation/use-super-admin-hero-slider-save.ts` |
| Super-admin page                    | `src/features/super-admin/presentation/SuperAdminHeroSliderPage.tsx`   |
| Profile preview integration         | `src/features/profile/presentation/ProfilePageContent.tsx`             |
| Profile image-editing tabs          | `src/features/profile/presentation/StoreIdentityCard.tsx`              |
| Image management UI                 | `@asol/storage-image-manager-core` via `@/features/storage/ui` |

## Component modes

The `mode` property accepts three values:

```ts
type HeroSliderMode = "view" | "admin-edit" | "images-edit";
```

### `view`

This is the default public display mode. It renders the carousel and enables:

- Per-slide autoplay durations.
- Previous and next controls with dynamic icons (swapping ChevronLeft/ChevronRight in RTL so that arrows always point outwards `<   >` in both English and Arabic).
- Long press pause: holding down the mouse button (on desktop) or pressing and holding (on mobile) temporarily pauses autoplay transition.
- Click prevention on long press: when holding down on a slide to pause, releasing it does not trigger the slide action (which is only triggered on short taps/clicks < 500ms).
- Slide indicators.
- Touch swiping.
- Keyboard navigation.
- RTL-aware navigation.
- Image preloading and loading skeletons in **view** mode only, while every slide is still probing. Admin preview never covers the carousel with that overlay; it shows the slide image or the unavailable placeholder so editors can fix content.
- Slides whose image URL is missing or fails to load are **omitted** from the carousel (probed off-screen first). If every slide is omitted, the same empty state as “no slides” is shown. Admin modes still surface the built-in unavailable placeholder so editors can fix content.
- Slide actions through `config.onAction` (with automatic bypass for keyboard actions).
- A safe empty state when no slides exist (displaying a user-friendly helper message instead of throwing errors).

```tsx
<HeroSlider config={config} />

// Equivalent explicit form
<HeroSlider mode="view" config={config} />
```

The project uses this mode in two places:

- `/home`, using the published `home-hero-slider` advertisement record.
- `/profile?mode=preview`, using the current profile owner's cover images.

### `admin-edit`

This is the full configuration editor. It renders a live carousel preview followed by administrative controls for:

- Transition type and transition duration.
- Autoplay and looping.
- Slide images.
- Titles and subtitles.
- Slide duration and action value.
- Adding and deleting slides.
- Reordering slides.

Autoplay, per-slide duration, looping, and transitions run in the admin live preview the same way as `view` mode. Slide tap actions stay disabled so editing does not navigate away. Add at least two slides to see transition effects; a single slide only shows titles and the static image.

The live preview merges local `data:` previews from `StorageImageManager` into the carousel via `mergeHeroSliderAdminPreview` without mutating the persisted editor config. Staged slide images appear in the carousel immediately; server upload and Home publication happen only when the super-admin clicks Save. Local `/sync_data/sync_file/...` URLs bypass the Next.js image optimizer so newly written files render immediately after Save.

Slide layout classes must stay space-separated (`absolute inset-0 …`). Concatenating tokens without spaces collapses the fill parent to zero size and leaves only the loading skeleton visible.

The project uses this mode only in `/super-admin/hero-slider`. It controls the Home slider and is not used by Profile.

```tsx
const [config, setConfig] = useState<HeroSliderConfig>(initialConfig);

<HeroSlider mode="admin-edit" config={config} onChange={setConfig} />;
```

The super-admin page has one "Save" button next to the check interval inputs. Edits and local image previews stay in the admin session until Save runs: pending uploads are flushed to storage, the configuration is written to SQLite/Turso, the Home cache is invalidated, and subscribers refresh. Home does not reflect draft edits before Save.

### `images-edit`

This is a restricted image editor. It does not render the carousel preview and does not expose transitions, titles, subtitles, actions, durations, autoplay, or ordering controls.

It displays up to four image slots backed by `StorageImageManager`. The project uses this mode in the “Storefront images” tab beside the “Profile image” tab in `/profile?mode=edit`.

```tsx
<HeroSlider
  mode="images-edit"
  config={profileHeroConfig}
  onChange={(nextConfig) => {
    void saveStoreImages({
      coverImageKeys: nextConfig.slides
        .map((slide) => slide.imageKey)
        .filter((key): key is string => Boolean(key))
        .slice(0, 4),
    });
  }}
/>
```

Only image references are persisted in this flow. All other Profile slider settings are fixed by `StoreIdentityCard` and `ProfilePageContent`.

## Public component API

```ts
interface HeroSliderProps {
  config: HeroSliderConfig;
  mode?: "view" | "admin-edit" | "images-edit";
  onChange?: (config: HeroSliderConfig) => void;
}
```

| Property   | Required | Default  | Purpose                                                      |
| ---------- | -------- | -------- | ------------------------------------------------------------ |
| `config`   | Yes      | —        | Supplies slider behavior and slides.                         |
| `mode`     | No       | `"view"` | Selects public display, full editing, or image-only editing. |
| `onChange` | No       | —        | Receives the updated configuration after an editor change.   |

Both editing modes maintain internal editing state and synchronize it whenever the `config` property changes.

## Configuration model

```ts
type HomeHeroTransition =
  | "Fade"
  | "CrossFade"
  | "SlideLeft"
  | "SlideRight"
  | "SlideUp"
  | "SlideDown"
  | "Zoom"
  | "Parallax"
  | "KenBurns"
  | "None";

interface HomeHeroConfig {
  autoPlay: boolean;
  loop: boolean;
  slides: HomeHeroSlide[];
}

interface HomeHeroSlide {
  priority: number;
  image: string;
  imageKey?: string;
  title: string;
  subtitle: string;
  duration: number;
  transition: HomeHeroTransition;
  transitionDuration: number;
  action: string;
}
```

### Field behavior

| Field                | Meaning                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `autoPlay`           | Enables automatic slide advancement in `view` mode.                                                                  |
| `loop`               | Returns to the first slide after the last slide.                                                                     |
| `priority`           | Sort order. Lower values render first. The full editor renumbers reordered slides as `100`, `200`, `300`, and so on. |
| `image`              | Displayable URL or local public path used by `next/image`.                                                           |
| `imageKey`           | Persistent storage object key used when saving, replacing, or deleting an uploaded image.                            |
| `title`              | Main slide heading. Profile-generated slides intentionally use an empty value.                                       |
| `subtitle`           | Badge text above the heading. Profile-generated slides intentionally use an empty value.                             |
| `duration`           | Time before autoplay advances from this slide, in milliseconds.                                                      |
| `transition`         | Visual transition used when **entering** this slide. Horizontal slides mirror automatically on backward navigation and in RTL. |
| `transitionDuration` | Transition animation duration in milliseconds for this slide (`0` with `None` snaps instantly).                      |
| `action`             | Application-defined value passed to `onAction`.                                                                      |
| `onAction`           | Runtime callback. It must not be serialized into JSON or stored in a database.                                       |

The component sorts a copied slide array and does not mutate `config.slides` directly.

## Home slider architecture

The Home slider is an advertisement managed by the super-admin workflow.

### Database

The local database is:

```text
public/sync_data/sync_sqlite/advertisements.db
```

Its schema is defined in:

```text
packages/data-core/src/core/database/advertisements/advertisements.schema.ts
```

Runtime behavior uses one `hero_slider` record with the ID `home-hero-slider`. `config_json` contains the complete current configuration, including slides.

| Column                   | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `id`                     | Stable slider identifier.                      |
| `config_json`            | Complete current configuration and slides.     |
| `version`                | Incremented on every successful save.          |
| `check_interval_minutes` | Client update-check interval.                  |
| `updated_at`             | Last successful save time.                     |
| `updated_by`             | UID that last saved the current configuration. |

There are no draft, publication, history, normalized-slide, or cleanup tables. The advertisements database has one clean migration. During early development it can be recreated locally with `npm run db:reset:advertisements` or in both SQLite and configured Turso with `npm run db:reset:advertisements:cloud`.

The initial record is validated and seeded from:

```text
src/features/advertisements/application/config/home-hero-slider.seed.json
```

The seed document contains `schemaVersion` and `config`. Zod validates it before insertion. The obsolete `src/features/home/presentation/home-hero-slider.json` file has been removed; there is now one seed source and one runtime database source.

### Server layers

The Home advertisement data flows through:

```text
API route
  -> HomeHeroSlider server service
  -> @asol/hero-slider-core service policy
  -> HomeHeroSlider repository
  -> advertisements database client
  -> advertisements.db / Turso advertisements database
```

Relevant files:

- `src/app/api/advertisements/home-hero-slider/route.ts`
- `src/app/api/advertisements/home-hero-slider/version/route.ts`
- `src/features/advertisements/server/services/home-hero-slider-service.server.ts`
- `packages/hero-slider-core/src/server/home-hero-slider-service.ts`
- `packages/data-core/src/domains/advertisements/repositories/home-hero-slider.repository.ts`
- `packages/data-core/src/core/database/advertisements-turso-db-client.ts`

### API routes

| Method and route                                                     | Purpose                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `GET /api/advertisements/home-hero-slider`                           | Returns the current Home configuration.                             |
| `GET /api/advertisements/home-hero-slider/version`                   | Returns version and timing metadata without the full configuration. |
| `GET /api/advertisements/home-hero-slider?admin=1&uid=...&phone=...` | Returns the current record to the super-admin editor.               |
| `PUT /api/advertisements/home-hero-slider`                           | Replaces the current record directly.                               |

The `PUT` payload contains only `identity`, `config`, and `checkIntervalMinutes`. Saving validates the full configuration, updates the single record in one transaction, and increments `version`.

### Super-admin editing flow

```text
/super-admin/hero-slider
  -> loads HomeHeroRecord through HomeHeroSliderApiService
  -> passes record.config to HeroSlider mode="admin-edit"
  -> receives changes through onChange
  -> receives changes through onChange (draft only; Home unchanged)
  -> Save uploads pending slide images, persists config, increments version
  -> Page-save runs upload in `prepareForSave` and always calls `persistConfig` when either `hero-slider-images` or `hero-slider-config` is selected, so image-only saves still reach the database
  -> invalidates the Home cache and broadcasts `asol:home-hero-slider-updated`
```

The super-admin page also controls `checkIntervalMinutes` and displays version/update metadata. Pending slide images are uploaded during Save, not on every edit. `useHomeHeroSlider` listens for the update event and forces a fresh fetch on Home only after a successful Save.

## Home synchronization and IndexedDB cache

`useHomeHeroSlider` prevents a full database-backed fetch every time Home loads.

The cached record is stored in:

```text
IndexedDB database: AsolDB
Object store: appSettings
Key: advertisements:home-hero-slider:v3
```

The cache contains the current configuration, version, update time, check interval, and `lastCheckedAt`.

Synchronization sequence:

1. Home renders the built-in fallback or cached configuration immediately.
2. The hook compares `lastCheckedAt` with `checkIntervalMinutes`.
3. If the interval has not expired, no server request is made.
4. When the interval expires, the hook requests only the version endpoint.
5. The full current configuration is requested when no cache exists, or when either `version` or `updatedAt` differs. The comparison is inequality, not “greater than”, so a development database reset to a lower version cannot strand an older cache.
6. The new configuration and check time are stored in IndexedDB.
7. Network failures preserve the last usable local configuration.

`checkIntervalMinutes`, each slide's `transitionDuration`, and each slide's `duration` are independent settings.

## Home image storage

The full administrative editor uses the storage profile:

```text
Profile ID: home-hero-slider
Provider: CloudflareR2
Local folder: images/advertisements/home-hero-slider
R2 folder: images/content/advertisements/home-hero-slider
Maximum processed image size: 1 MB (1024 KB)
Output format: WebP
```

This profile is declared in `packages/storage-core/src/config/storage-profiles.json` and exposed as `StorageProfiles.HomeHeroSlider`.

`StorageImageManager` uploads the image and returns:

```ts
interface StoredImage {
  imageKey: string;
  url: string;
}
```

The URL becomes `slide.image`, while the persistent object key becomes `slide.imageKey`. Uploaded images are identified by `imageKey`; the server regenerates their public URLs through the configured storage provider when returning data. A stored URL remains useful for external seed images that have no managed key.

**Persistence contract (all runtimes):** the database stores only `imageKey` for managed home-hero-slider uploads; `image` is cleared on save. Every read (`getCurrent`, `getAdmin`, post-save response) resolves `image` from `imageKey` through the active storage provider:

| Runtime | Provider | Public URL shape |
| --- | --- | --- |
| Local dev (`next dev` / `next start`) | `LocalStorageProvider` | `/sync_data/sync_file/images/advertisements/home-hero-slider/{key}` |
| Production / static web / Android (OTA) | Cloudflare R2 | `https://…r2.dev/images/content/advertisements/home-hero-slider/{key}` |

Saving rejects managed slide URLs without `imageKey`. Removed keys are deleted only after a successful save and only when the object still exists in storage.

In local development those public URLs use `/sync_data/sync_file/...`. `shouldUseUnoptimizedImage` treats that prefix, `blob:`, `data:`, and listed CDN hosts as unoptimized so `next/image` does not send them through `/_next/image`.

Removing an image in the editor only changes the local form. On Save, the server first commits the new configuration to SQLite or Turso. Only after that succeeds does it delete removed managed image keys from local storage or R2. A failed database save never deletes a referenced image, and there is no delayed cleanup queue.

## Profile slider architecture

Profile does not use `advertisements.db`, the Home advertisement API, or the `home-hero-slider` storage profile.

### Profile preview

`ProfilePageContent` reads the current user's stored image data through `useProfileStoreImages` and converts `coverUrls` and `coverImageKeys` into a fixed `HeroSliderConfig`.

```text
/profile?mode=preview
  -> useProfileStoreImages
  -> profile API
  -> profile database
  -> user_profiles cover image fields
  -> HeroSlider mode="view"
```

Profile slider behavior is fixed in code:

- Transition: `SlideLeft`.
- Transition duration: `500` ms.
- Autoplay: enabled.
- Looping: enabled.
- Slide duration: `4000` ms.
- Empty titles, subtitles, and actions.

If the user has no storefront images, the reusable slider displays its empty state.

### Profile editing

`/profile?mode=edit` does not display a carousel preview. `StoreIdentityCard` contains two image tabs:

- “Profile image” manages the store logo/avatar.
- “Storefront images” renders `HeroSlider` in `images-edit` mode.

The image-only editor exposes four slots in a fixed 2×2 grid and returns updated slide image keys through `onChange`. Selecting an image marks the unified Profile save bar dirty. The logo and storefront managers stay mounted while their visual tabs change, so a locally staged draft keeps its live upload handle. Every unified Profile save attempts the pending-image preparation step first and treats that save gesture as upload confirmation; the per-image confirmation dialog is only for the manual upload button. Upload callbacks update synchronous touched/image refs before the commit reads keys, preventing the same render from persisting a stale pre-upload key. A failed upload blocks the save. The commit persists only the first four canonical cover keys through `saveStoreImages`, while untouched logo or cover fields are preserved rather than overwritten.

The four slots are defined in one versioned configuration document:

```text
src/features/profile/presentation/image-configs/storefront-images.image.json
```

`HeroSliderImagesEditor` parses each slot through `parseStorageImageManagerConfig`. Every slot uses the shared `StorageImageManager` card chrome and empty-state layout from `@asol/storage-image-manager-core`, matching profile logo uploads and other image pickers project-wide.

```text
/profile?mode=edit
  -> StoreIdentityCard storefront-images tab
  -> HeroSlider mode="images-edit"
  -> StorageImageManager
  -> storage upload API
  -> saveStoreImages({ coverImageKeys })
  -> profile API
  -> profile database
```

### Profile database fields

Profile image references are stored in the profile shards:

| Column                  | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `avatar_image_key`      | Store logo/profile image object key.                             |
| `profile_images.image_key` | Canonical image object key. |
| `profile_images.image_type` | `avatar` or `cover`. |
| `profile_images.sort_order` | Canonical order of up to four storefront images. |

There is no singular cover-key write contract or fallback column. The API exposes `coverImageKeys` as the only persisted cover-key collection and derives `coverUrl` from its first item solely as a display convenience.

The profile service resolves those keys into `avatarUrl`, `coverUrl`, and `coverUrls` before returning data to the client.

### Profile image storage

Storefront images use the existing Cover storage profile:

```text
Profile ID: cover
Provider: CloudflareR2
Local folder: images/covers
R2 folder: images/profile/covers
Maximum processed image size: 30 KB
Output format: WebP
```

The store logo uses the Avatar storage profile:

```text
Profile ID: avatar
Provider: CloudflareR2
Local folder: images/avatars
R2 folder: images/profile/avatars
Maximum processed image size: 20 KB
Output format: WebP
```

These profiles are also declared in `packages/storage-core/src/config/storage-profiles.json`.

## Choosing the correct mode and persistence flow

| Use case                        | Mode          | Persistence                                            | Image profile      |
| ------------------------------- | ------------- | ------------------------------------------------------ | ------------------ |
| Public Home slider              | `view`        | Current `home-hero-slider` record plus IndexedDB cache | `home-hero-slider` |
| Super-admin Home editor         | `admin-edit`  | Single current JSON record in `advertisements.db`      | `home-hero-slider` |
| Profile preview                 | `view`        | Image keys in the profile media/core shards            | `cover`            |
| Profile storefront-image editor | `images-edit` | Ordered `profile_images` rows with `image_type = 'cover'` | `cover`            |

Do not connect Profile to the advertisements database. Do not use `images-edit` for Home administration because it intentionally discards non-image slide fields when rebuilding slides. Do not expose `admin-edit` to profile owners.

## Adding another slider usage

For a read-only carousel:

1. Build a valid `HeroSliderConfig`.
2. Add runtime `onAction` behavior in the page component.
3. Render `HeroSlider` in `view` mode.

For a new editable carousel:

1. Decide whether it needs full configuration editing or image-only editing.
2. Define a separate persistence identifier and schema instead of reusing `home-hero-slider`.
3. Define an appropriate storage profile and folder.
4. Load stored data into `HeroSliderConfig`.
5. Persist `onChange` or `onSave` output through a feature service, never directly from the UI to a database.
6. Enforce authorization in the API and server service.

## Operational and security notes

- The UI hides the super-admin menu and redirects unauthorized page access.
- Administrative API operations currently validate the configured UID and phone number.
- The existing application session is client-stored. Strong production authorization requires a signed server-verifiable session; hiding controls and accepting client identity fields are not sufficient against forged requests.
- Never serialize callback functions such as `onAction`.
- Wait for image upload completion and a non-empty `imageKey` before persisting an image reference.
- Save the database record before deleting removed Home image objects.
- Keep Profile image limits aligned across the UI, profile service, and repository. The current maximum is four.
