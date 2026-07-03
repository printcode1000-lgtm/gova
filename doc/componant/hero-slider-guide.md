# HeroSlider Developer Guide

`HeroSlider` is the single reusable carousel component used throughout the project. Pages do not maintain separate slider implementations. Instead, they provide different configurations, persistence adapters, and editing modes to the same component.

## Source files

| Responsibility                      | File                                                        |
| ----------------------------------- | ----------------------------------------------------------- |
| Reusable component and public types | `src/components/ui/HeroSlider.tsx`                          |
| Full administrative editor          | `src/components/ui/HeroSliderEditor.tsx`                    |
| Image-only profile editor           | `src/components/ui/HeroSliderImagesEditor.tsx`              |
| Home integration                    | `src/components/home/HomeScreen.tsx`                        |
| Home cache and synchronization      | `src/features/advertisements/hooks/use-home-hero-slider.ts` |
| Super-admin page                    | `src/components/super-admin/SuperAdminHeroSliderPage.tsx`   |
| Profile preview integration         | `src/components/profile/ProfilePageContent.tsx`             |
| Profile image-editing tabs          | `src/components/profile/StoreIdentityCard.tsx`              |
| Image management UI                 | `src/features/storage/components/StorageImageManager.tsx`   |

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
- Image preloading and loading skeletons.
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

Autoplay and slide actions are disabled while editing. This prevents the editor from navigating away or changing slides unexpectedly.

The project uses this mode only in `/super-admin/hero-slider`. It controls the Home slider and is not used by Profile.

```tsx
const [draft, setDraft] = useState<HeroSliderConfig>(initialConfig);

<HeroSlider
  mode="admin-edit"
  config={draft}
  onChange={setDraft}
/>;
```

The super-admin page has a single "نشر على Home" button placed next to the check interval inputs for immediate publication. All previous "التراجع عن التغييرات", "حفظ كمسودة", and "تراجع" actions and their buttons have been removed from the UI.

### `images-edit`

This is a restricted image editor. It does not render the carousel preview and does not expose transitions, titles, subtitles, actions, durations, autoplay, or ordering controls.

It displays up to three image slots backed by `StorageImageManager`. The project uses this mode in the “Storefront images” tab beside the “Profile image” tab in `/profile?mode=edit`.

```tsx
<HeroSlider
  mode="images-edit"
  config={profileHeroConfig}
  onChange={(nextConfig) => {
    void saveStoreImages({
      coverImageKeys: nextConfig.slides
        .map((slide) => slide.imageKey)
        .filter((key): key is string => Boolean(key))
        .slice(0, 3),
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

| Property   | Required | Default  | Purpose                                                              |
| ---------- | -------- | -------- | -------------------------------------------------------------------- |
| `config`   | Yes      | —        | Supplies slider behavior and slides.                                 |
| `mode`     | No       | `"view"` | Selects public display, full editing, or image-only editing.         |
| `onChange` | No       | —        | Receives the updated draft after an editor change.                   |

Both editing modes maintain an internal draft and synchronize it whenever the `config` property changes.

## Configuration model

```ts
type HeroSliderTransition =
  | "Fade"
  | "SlideLeft"
  | "SlideRight"
  | "Zoom"
  | "Parallax";

interface HeroSliderConfig {
  transition: HeroSliderTransition;
  transitionDuration: number;
  autoPlay: boolean;
  loop: boolean;
  slides: HeroSliderSlide[];
  onAction?: (action: string) => void;
}

interface HeroSliderSlide {
  priority: number;
  image: string;
  imageKey?: string;
  title: string;
  subtitle: string;
  duration: number;
  action: string;
}
```

### Field behavior

| Field                | Meaning                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `transition`         | Visual transition applied to every slide.                                                                            |
| `transitionDuration` | Transition animation duration in milliseconds.                                                                       |
| `autoPlay`           | Enables automatic slide advancement in `view` mode.                                                                  |
| `loop`               | Returns to the first slide after the last slide.                                                                     |
| `priority`           | Sort order. Lower values render first. The full editor renumbers reordered slides as `100`, `200`, `300`, and so on. |
| `image`              | Displayable URL or local public path used by `next/image`.                                                           |
| `imageKey`           | Persistent storage object key used when saving, replacing, or deleting an uploaded image.                            |
| `title`              | Main slide heading. Profile-generated slides intentionally use an empty value.                                       |
| `subtitle`           | Badge text above the heading. Profile-generated slides intentionally use an empty value.                             |
| `duration`           | Time before autoplay advances from this slide, in milliseconds.                                                      |
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
src/core/database/advertisements/advertisements.schema.ts
```

The database uses four related tables. `hero_sliders` contains one Home record with the ID `home-hero-slider` and stores aggregate behavior and publication metadata.

| Column                   | Purpose                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `id`                     | Stable slider identifier.                                                                              |
| `draft_json`             | Draft-level behavior settings; retained for migration compatibility. Slides are normalized separately. |
| `published_json`         | Published behavior settings; retained for migration compatibility. Slides are normalized separately.   |
| `status`                 | `draft` or `published`.                                                                                |
| `version`                | Incremented whenever a configuration is published.                                                     |
| `revision`               | Incremented on every draft save, publish, or restore for optimistic locking.                           |
| `schema_version`         | Stored configuration schema version.                                                                   |
| `check_interval_minutes` | Client update-check interval.                                                                          |
| `updated_by`             | UID that last changed the draft or publication.                                                        |
| `published_by`           | UID that last published the slider.                                                                    |
| `updated_at`             | Last draft or publish update time.                                                                     |
| `published_at`           | Last publication time.                                                                                 |

`hero_slider_slides` stores each slide as an independent row. The composite identity is slider ID, stage (`draft` or `published`), and slide ID. Image keys, cached URLs, text, ordering, actions, and duration are stored as columns.

`hero_slider_publications` stores immutable published snapshots with version, actor, and publication time. These snapshots are retained in the database for auditing and schema integration, but are no longer listed or restorable from the super-admin dashboard.

`advertisement_image_cleanup` queues uploaded image keys removed by a publication. Objects are retained for a seven-day safety period and deleted by the server cleanup flow only after that period.

The initial record is validated and seeded from:

```text
src/features/advertisements/config/home-hero-slider.seed.json
```

The seed document contains `schemaVersion` and `config`. Zod validates it before insertion. The obsolete `src/components/home/home-hero-slider.json` file has been removed; there is now one seed source and one runtime database source.

### Server layers

The Home advertisement data flows through:

```text
API route
  -> HomeHeroSlider server service
  -> HomeHeroSlider repository
  -> advertisements database client
  -> advertisements.db / normalized advertisement tables
```

Relevant files:

- `src/app/api/advertisements/home-hero-slider/route.ts`
- `src/app/api/advertisements/home-hero-slider/version/route.ts`
- `src/features/advertisements/services/home-hero-slider-service.server.ts`
- `src/features/advertisements/repositories/home-hero-slider.repository.ts`
- `src/core/database/advertisements-db-client.ts`

### API routes

| Method and route                                                       | Purpose                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `GET /api/advertisements/home-hero-slider`                             | Returns the published Home configuration.                           |
| `GET /api/advertisements/home-hero-slider/version`                     | Returns version and timing metadata without the full configuration. |
| `GET /api/advertisements/home-hero-slider?admin=1&uid=...&phone=...`   | Returns draft and publication metadata for the super-admin editor.  |
| `GET /api/advertisements/home-hero-slider?history=1&uid=...&phone=...` | Returns publication history.                                        |
| `PUT /api/advertisements/home-hero-slider`                             | Saves a draft, publishes, or restores a historical publication.     |

The `PUT` payload uses `action: "save-draft"`, `action: "publish"`, or `action: "restore"`. Every mutation includes `expectedRevision`. A stale revision fails instead of overwriting another editor's work. Publishing runs in one database transaction: it updates metadata, replaces normalized draft and published slides, records history, increments `version` and `revision`, and queues removed image keys.

### Super-admin editing flow

```text
/super-admin/hero-slider
  -> loads HomeHeroRecord through HomeHeroSliderApiService
  -> passes record.draft to HeroSlider mode="admin-edit"
  -> receives changes through onChange
  -> saves draft without changing Home
  -> publishes normalized slide rows and increments version
```

The super-admin page also controls `checkIntervalMinutes` and displays status and version metadata. Zod validates every submitted configuration in the server service before repository writes.

## Home synchronization and IndexedDB cache

`useHomeHeroSlider` prevents a full database-backed fetch every time Home loads.

The cached record is stored in:

```text
IndexedDB database: GovaDB
Object store: appSettings
Key: advertisements:home-hero-slider
```

The cache contains the published configuration, version, publication time, check interval, and `lastCheckedAt`.

Synchronization sequence:

1. Home renders the built-in fallback or cached configuration immediately.
2. The hook compares `lastCheckedAt` with `checkIntervalMinutes`.
3. If the interval has not expired, no server request is made.
4. When the interval expires, the hook requests only the version endpoint.
5. The full published configuration is requested only when the server version is newer or no cache exists.
6. The new configuration and check time are stored in IndexedDB.
7. Network failures preserve the last usable local configuration.

`checkIntervalMinutes`, `transitionDuration`, and each slide's `duration` are independent settings.

## Home image storage

The full administrative editor uses the storage profile:

```text
Profile ID: home-hero-slider
Provider: CloudflareR2
Folder: images/advertisements/home-hero-slider
Maximum processed image size: 80 KB
Output format: WebP
```

This profile is declared in `src/config/storage-profiles.json` and exposed as `StorageProfiles.HomeHeroSlider`.

`StorageImageManager` uploads the image and returns:

```ts
interface StoredImage {
  imageKey: string;
  url: string;
}
```

The URL becomes `slide.image`, while the persistent object key becomes `slide.imageKey`. Uploaded images are identified by `imageKey`; the server regenerates their public URLs through the configured storage provider when returning data. A stored URL remains useful for external seed images that have no managed key.

Removing an image from a Home draft does not delete the published object. When a later publication removes a managed image key, it is added to the delayed cleanup queue. This protects live and recently restored publications from immediate object deletion.

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

The image-only editor exposes three slots and returns updated slide image keys through `onChange`. `StoreIdentityCard` persists only the first three keys using `saveStoreImages`.

The three slots are defined in one versioned configuration document:

```text
src/components/profile/image-configs/storefront-images.image.json
```

`HeroSliderImagesEditor` parses each slot through `parseStorageImageManagerConfig`. Consolidating the former three files does not change `StorageImageManager` behavior because every slot retains its own ID and validation settings.

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

Profile image references are stored in `profile.db`, table `user_profiles`:

| Column                  | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `avatar_image_key`      | Store logo/profile image object key.                             |
| `cover_image_key`       | First storefront image key retained for legacy compatibility.    |
| `cover_image_keys_json` | Ordered JSON array containing up to three storefront image keys. |

The profile service resolves those keys into `avatarUrl`, `coverUrl`, and `coverUrls` before returning data to the client.

### Profile image storage

Storefront images use the existing Cover storage profile:

```text
Profile ID: cover
Provider: CloudflareR2
Folder: images/covers
Maximum processed image size: 30 KB
Output format: WebP
```

The store logo uses the Avatar storage profile:

```text
Profile ID: avatar
Provider: CloudflareR2
Folder: images/avatars
Maximum processed image size: 20 KB
Output format: WebP
```

These profiles are also declared in `src/config/storage-profiles.json`.

## Choosing the correct mode and persistence flow

| Use case                        | Mode          | Persistence                                                     | Image profile      |
| ------------------------------- | ------------- | --------------------------------------------------------------- | ------------------ |
| Public Home slider              | `view`        | Published `home-hero-slider` advertisement plus IndexedDB cache | `home-hero-slider` |
| Super-admin Home editor         | `admin-edit`  | Draft and published JSON in `advertisements.db`                 | `home-hero-slider` |
| Profile preview                 | `view`        | Image keys in `profile.db`                                      | `cover`            |
| Profile storefront-image editor | `images-edit` | `user_profiles.cover_image_keys_json`                           | `cover`            |

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
- Preserve the separation between draft and published Home images.
- Keep Profile image limits aligned across the UI, profile service, and repository. The current maximum is three.
