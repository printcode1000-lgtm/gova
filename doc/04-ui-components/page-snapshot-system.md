# Page Snapshot System

## Overview

The Page Snapshot System restores a ASOL page to the state the user left behind, giving the web and Capacitor builds a native mobile feel. It stores snapshots in `AsolDB`, the project IndexedDB database, and never uses `localStorage` or `sessionStorage`.

The system is mounted globally through `SnapshotProvider` in the root layout. Pages get automatic scroll, focus, and form restoration by default. Components that need local React state restoration can opt in with `useSnapshotState`.

## Architecture

The module lives under:

```text
src/features/page-snapshot
```

Main parts:

```text
entities/page-snapshot.types.ts
  Snapshot contracts, version, identity, and options.

services/page-snapshot-service.ts
  AsolDB persistence, key creation, TTL/version checks, DOM capture, and DOM restore.

hooks/use-page-snapshot.tsx
  SnapshotProvider, usePageSnapshot, and useSnapshotState.

index.ts
  Public module exports.
```

Storage is provided by:

```text
src/lib/asol-db/index.ts
```

The `AsolDB` schema version is increased and a new object store is added:

```text
pageSnapshots
```

## Data Model

Each stored snapshot contains:

```ts
interface PageSnapshotRecord {
  key: string;
  userId: string;
  route: string;
  pathname: string;
  params: Record<string, string | string[]>;
  query: Record<string, string | string[]>;
  scroll: {
    x: number;
    y: number;
    elements: Record<string, { x: number; y: number }>;
  };
  focusedElement: string | null;
  activeTab: string | null;
  accordions: Record<string, boolean>;
  selectedItems: string[];
  filters: Record<string, unknown>;
  searchText: string | null;
  sortOptions: Record<string, unknown>;
  pagination: Record<string, unknown>;
  infiniteScroll: Record<string, unknown>;
  expandedSections: Record<string, boolean>;
  formValues: PageSnapshotFormField[];
  unsavedDraftData: Record<string, unknown>;
  uiState: Record<string, unknown>;
  componentState: Record<string, unknown>;
  routeParameters: Record<string, string | string[]>;
  queryParameters: Record<string, string | string[]>;
  loadedDataCacheRefs: string[];
  timestamp: number;
  expiresAt: number;
  snapshotVersion: number;
  appBuildId: string;
}
```

## Snapshot Key

The key is deterministic and supports multiple snapshots at the same time:

```text
userId + route + pathname + params + query
```

The implementation normalizes and stable-serializes params and query values, so the same page always resolves to the same key even when query parameters are ordered differently.

## Lifecycle

### Entering a Page

1. The page renders normally.
2. `SnapshotProvider` computes the current snapshot identity from the user, route, pathname, and query.
3. It loads a compatible snapshot from `AsolDB`.
4. It waits briefly so the page has time to mount required UI.
5. It restores registered component state.
6. It restores form values.
7. It restores element scroll containers marked with `data-snapshot-scroll`.
8. It restores window scroll.
9. It restores focus when the element is safe and still exists.

Pages with async data can call `usePageSnapshot({ restoreWhen: dataReady })` and restore manually after required data has loaded.

### Leaving a Page

Snapshots are saved:

- When the page route changes.
- On `pagehide`.
- On `beforeunload`.
- When the browser tab/app becomes hidden.
- When a Capacitor app emits `appStateChange` with `isActive = false`.
- After important UI changes with debounced writes.

## Storage Strategy

Snapshots are stored only in IndexedDB:

```text
AsolDB -> pageSnapshots
```

No snapshot data is written to:

- `localStorage`
- `sessionStorage`
- Cookies
- Server databases

This makes the system suitable for:

- Web
- Android via Capacitor WebView
- iOS via Capacitor WebView

## Restore Flow

The default restore flow is:

1. `restoreSnapshot(identity)`
2. Check existence.
3. Check TTL.
4. Check snapshot version.
5. Check application build id.
6. Restore `componentState` through registered hooks.
7. Restore DOM form values.
8. Dispatch `input` and `change` events.
9. Restore scroll containers.
10. Restore window scroll.
11. Restore focus without scrolling.

Incompatible snapshots are deleted and ignored.

## Save Flow

The default save flow is:

1. Collect current identity.
2. Collect window scroll.
3. Collect marked element scroll.
4. Collect focused element.
5. Collect safe form values.
6. Collect open accordions and expanded sections marked with data attributes.
7. Collect selected items marked with data attributes.
8. Collect registered component state.
9. Attach timestamp, expiration, snapshot version, and build id.
10. Save the record to `AsolDB`.

Writes are debounced by default to reduce IndexedDB operations.

## API

Public exports are available from:

```ts
import {
  saveSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  clearSnapshots,
  hasSnapshot,
  pauseSnapshot,
  resumeSnapshot,
  usePageSnapshot,
  useSnapshotState,
  SnapshotProvider,
} from '@/features/page-snapshot';
```

### saveSnapshot

Stores a snapshot for an identity.

```ts
await saveSnapshot({
  userId,
  route: '/categories/[id]',
  pathname: '/categories/46',
  params: { id: '46' },
  query: { sort: 'newest' },
});
```

### restoreSnapshot

Loads a compatible snapshot without applying it.

```ts
const snapshot = await restoreSnapshot({
  userId,
  route: '/profile',
  pathname: '/profile',
  query: { mode: 'edit' },
});
```

### deleteSnapshot

Deletes one snapshot.

```ts
await deleteSnapshot(identity);
```

### clearSnapshots

Deletes all snapshots or only snapshots for one user.

```ts
await clearSnapshots();
await clearSnapshots(userId);
```

### hasSnapshot

Checks whether a compatible snapshot exists.

```ts
const exists = await hasSnapshot(identity);
```

### pauseSnapshot / resumeSnapshot

Temporarily disables or re-enables saving.

```ts
pauseSnapshot();
resumeSnapshot();
```

## React Integration

### SnapshotProvider

Mounted once in `src/app/layout.tsx`.

```tsx
<SnapshotProvider>
  <ShellLayout>{children}</ShellLayout>
</SnapshotProvider>
```

### usePageSnapshot

Use this hook when a page needs explicit control.

```tsx
const snapshot = usePageSnapshot({
  ttlMs: 1000 * 60 * 60,
  restoreWhen: !isLoading,
});

await snapshot.saveSnapshot({
  filters,
  searchText,
  sortOptions,
  pagination,
});
```

### useSnapshotState

Use this for component local state that cannot be inferred from the DOM.

```tsx
const [activeTab, setActiveTab] = useSnapshotState('profile.activeTab', 'products');
const [selectedIds, setSelectedIds] = useSnapshotState<string[]>('products.selectedIds', []);
```

The value is saved in `componentState` and restored when the page is revisited.

## Data Attributes

Optional attributes improve automatic capture:

```html
<div data-snapshot-scroll data-snapshot-id="product-grid">...</div>
<details data-snapshot-accordion="seller-filters">...</details>
<section data-snapshot-expanded="reviews">...</section>
<button data-snapshot-selected="true" data-snapshot-item="product-123">...</button>
<input data-snapshot-id="seller-search" name="search" />
```

Use this to opt out:

```html
<div data-snapshot-ignore>...</div>
```

Use this for sensitive fields:

```html
<input data-snapshot-sensitive />
```

## Expiration and Compatibility

The system supports:

- Configurable TTL per save.
- Automatic cleanup of expired snapshots.
- Snapshot version checks.
- Build id checks through `publicEnv.buildId`.

When the application version or snapshot format changes, incompatible snapshots are ignored and removed.

## Security Considerations

The system never persists:

- Password fields.
- Hidden inputs.
- File inputs.
- Payment information.
- Authentication tokens.
- Secret, token, OTP, PIN, or card-like fields.
- One-time notifications.
- Temporary loading states.
- Temporary error messages.

Sensitive fields are detected through input type, names, ids, autocomplete values, and `data-snapshot-sensitive`.

## Performance Considerations

The system is designed to avoid excessive work:

- IndexedDB writes are debounced.
- Restore is lazy and delayed until the page has mounted.
- Component state is restored only when registered.
- DOM scanning is limited to forms and explicit snapshot attributes.
- Large React state should store references or compact values, not full datasets.
- Query data should continue to use the existing React Query AsolDB persister.

## Capacitor Compatibility

Capacitor support is handled with:

```ts
App.addListener('appStateChange', ...)
```

When Android or iOS sends the app to the background, the provider flushes the current snapshot to `AsolDB`.

## Future Extensibility

Planned extensions can include:

- Page-level snapshot policies.
- Per-route TTL configuration.
- Snapshot size budgets.
- Compression for very large drafts.
- Developer tooling under `/dev`.
- Integration with route-specific data cache references.
- More semantic adapters for tabs, accordions, virtualized lists, and infinite-scroll components.
