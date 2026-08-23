# `@asol/map-core` Module

`@asol/map-core` is ASOL's sealed, provider-agnostic mapping package, at `packages/map-core/`.
It uses MapLibre GL JS, GeoJSON, OpenStreetMap-compatible tiles, and Supercluster. It has no
Mapbox, Google Maps, paid SDK, or map-engine API-key requirement.

It is held to [The Eight Module Isolation Rules](module-isolation-rules.md).

## Isolation contract

| Rule | How it is met |
| --- | --- |
| 1. Core module | All map logic lives in `packages/map-core/`; nothing outside it constructs a MapLibre instance. |
| 2. Single public API | One door: `@asol/map-core`. There is no `/server` entry — the package is client-only. |
| 3. Tests gate the build | `npm run test:map-core` runs inside `test`, `build`, and `build:static`. |
| 4. Internal validation | Providers are injected and validated at their boundary; GPS resolves its permission before positioning. |
| 5. No internal imports | Enforced by `checkPackageSealContract`, which reads the `exports` map and also rejects relative paths into `packages/`. |
| 6. Branch protection | Repository-wide, unchanged. |
| 7. No reverse dependency | The package never imports from the application alias `@/`; a test asserts this per file. |
| 8. Documented | This file. |

The package depends on exactly one other package, `@asol/native-core`, through its declared door,
for platform GPS and permissions.

### What it deliberately does not do

**It never persists anything.** There is no save control and no `onSave`: the package reports what
the user picked and the host decides what to store. This is why the toolbar has no `save` entry in
`AsolMapControlId`.

**It owns no wording.** A sealed package cannot reach the application's translation dictionary, so
every label is a prop (`toolbar[id].label`, `addressPrompt.*`, `toolbarLabel`), with English
fallbacks for a consumer that omits one.

## Installation and import

The dependencies are part of the workspace. Import the component and only the factories/types that
a feature needs, always through the package door:

```tsx
import {
  AsolMap,
  createOpenStreetMapProvider,
  type AsolMapMarker,
} from '@asol/map-core';
```

`AsolMap` is a client component. A server component may render a client wrapper that contains it. No `ssr: false` dynamic import is required.

## Minimal example

```tsx
'use client';

import { useMemo } from 'react';
import { AsolMap, createOpenStreetMapProvider } from '@asol/map-core';

export function StoreMap() {
  const tile = useMemo(() => createOpenStreetMapProvider(), []);

  return (
    <AsolMap
      style={{ height: 420 }}
      providers={{ tile }}
      initialViewport={{ latitude: 30.0444, longitude: 31.2357, zoom: 12 }}
      modes={['view']}
      toolbar={{ zoom: true, compass: true, fullscreen: true }}
      onError={(error) => console.error(error)}
    />
  );
}
```

The public OpenStreetMap tile service is suitable for normal interactive use subject to its tile usage policy. High-volume production deployments should inject an OSM-compatible provider with appropriate capacity. Application code does not change when the provider changes.

## Architecture

The package is split by responsibility:

| Module | Responsibility |
| --- | --- |
| `AsolMap.tsx` | Map engine lifecycle, event translation, layer orchestration, worker URL pinning, and recovery UI |
| `AddressBalloon.tsx` | The in-map address form rendered inside the marker popup |
| `providers.ts` | Tile-provider contracts and raster/OSM provider factories |
| `gps.ts` | Browser and native/Capacitor geolocation adapters |
| `AsolMapControls.tsx` | Accessible independent controls |
| `geometry.ts` | Pure GeoJSON and circle conversion utilities |
| `clustering.ts` | Reusable Supercluster spatial index |
| `theme.ts` | Theme resolution and map color defaults |
| `types.ts` | Complete public contract |
| `AsolMap.css` | Responsive, safe-area-aware presentation |

Features must import this component instead of creating MapLibre instances directly. Business behavior belongs in feature callbacks, not in `AsolMap`.

All paths are relative to `packages/map-core/src/`.

## Worker hosting (required)

MapLibre resolves its worker as `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
Inside a Next.js bundle `import.meta.url` is the emitted chunk URL, so the request
lands on `/_next/static/chunks/maplibre-gl-worker.mjs` — a path Next answers with its
HTML 404 page, which the browser rejects:

```text
Failed to load module script: the server responded with a non-JavaScript MIME type
of "text/html".
```

The failure is close to invisible. Raster tiles are decoded on the main thread, so the
map still draws, pans, and zooms. Everything the worker tiles — **every GeoJSON source,
which is how ASOL renders markers, polygons, circles, and routes** — silently produces
nothing: `map.isSourceLoaded('asol-markers')` never turns true and no error is raised
on the map. The reported symptom was a location pin that never appeared, whether the
point came from tapping the map or from the GPS control.

ASOL therefore hosts the worker itself:

- `scripts/sync-maplibre-worker.ts` (`npm run maplibre:sync`) copies
  `maplibre-gl-worker.mjs` **and `maplibre-gl-shared.mjs`** from the installed package
  into `public/`. The worker is not self-contained — it imports the shared runtime as a
  sibling, so copying the worker alone reproduces the same 404-as-HTML one level deeper.
- `AsolMap.tsx` calls `setWorkerUrl('/maplibre-gl-worker.mjs')` at module scope.
- The sync runs from `app:init` (so `npm run build` and `npm run dev:checked` cover it)
  and explicitly in `build:static`, which does not go through `app:init`.
  `npm run dev` is intentionally fast and does not run this sync before startup.
- `npm run architecture:check` fails if either artifact is missing, has drifted from
  the installed package, or if `AsolMap` stops pinning the worker URL.

After `npm install` upgrades `maplibre-gl`, run `npm run maplibre:sync` and commit the
refreshed `public/` copies.

## Providers

`providers.tile` is required. All other providers are optional and injected through `AsolMapProviders`.

### `TileProvider`

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable provider identifier. |
| `attribution` | `string` | Required data attribution. |
| `getStyle(theme)` | `StyleSpecification \| Promise<StyleSpecification>` | Returns a MapLibre style for light or dark rendering. |
| `transformRequest` | optional function | Rewrites requests or adds headers at the provider boundary. |

Create a configurable raster provider:

```tsx
const tile = createRasterTileProvider({
  id: 'company-osm-proxy',
  tiles: [runtimeConfig.tileTemplate],
  attribution: runtimeConfig.tileAttribution,
  maxZoom: 20,
});
```

### `GeocoderProvider`

`forward(query, signal)` resolves text to `GeocoderResult[]`. `reverse(coordinates, signal)` resolves coordinates to results. Each result contains `id`, `label`, latitude, longitude, optional bounds, and optional raw provider data. The component does not choose or call a proprietary geocoder.

### `RoutingProvider`

`calculate(request)` accepts origin, destination, optional waypoints, profile (`driving`, `walking`, or `cycling`), and an abort signal. It returns an id, GeoJSON LineString, distance in metres, duration in seconds, and optional raw provider data.

### `ElevationProvider`

Reserved for forward-compatible elevation features. `getElevations(coordinates, signal)` returns elevations in metres in input order.

### `GpsProvider`

`isAvailable`, `getCurrentPosition`, and optional `watchPosition` isolate platform APIs. `createBrowserGpsProvider()` uses the Web Geolocation API. `createAdaptiveGpsProvider(nativeBridge)` prefers an injected native/Capacitor-compatible bridge and otherwise uses the browser. This avoids importing platform code into UI or business logic.

```tsx
import { Geolocation } from '@capacitor/geolocation';
import { createAdaptiveGpsProvider } from '@asol/map-core';

const gps = createAdaptiveGpsProvider(Geolocation);
<AsolMap providers={{ tile, gps }} modes={['tracking']} toolbar={{ gps: true }} />;
```

Request Android/iOS permissions in the native project and user flow before starting location tracking. Always stop tracking when the owning screen is dismissed; `AsolMap` also cleans up its watcher on unmount.

## Props

| Prop | Type | Default / purpose |
| --- | --- | --- |
| `id` | `string` | Optional root DOM id. |
| `className` | `string` | Additional root class. |
| `style` | `CSSProperties` | Root style; normally supplies an explicit height. |
| `ariaLabel` | `string` | `Interactive map`. Accessible map name. |
| `modes` | `AsolMapMode[]` | `['view']`. Composable behavior modes. |
| `initialViewport` | `AsolMapViewport` | Suez Governorate, Egypt at zoom 9.5 if omitted. A supplied/saved viewport always takes precedence. |
| `minZoom`, `maxZoom` | `number` | Map zoom constraints. |
| `providers` | `AsolMapProviders` | Required provider registry. |
| `routeRequest` | `RouteRequest` | Optional controlled routing request; uses `providers.routing`, renders the result, and emits `onRouteCalculated`. |
| `toolbar` | `ToolbarConfig` | Independently enabled controls. |
| `layers` | `LayerConfig` | Visibility for base map, markers, clusters, routes, circles, polygons, heat map, popup, and controls. |
| `theme` | `AsolMapTheme` | Auto theme and optional color/class overrides. |
| `markers` | `AsolMapMarker[]` | Controlled marker GeoJSON features. |
| `polygons` | `AsolMapPolygon[]` | Controlled polygon features. |
| `circles` | `AsolMapCircle[]` | Controlled geodesic-style circles expressed as centre/radius. |
| `routes` | `AsolMapRoute[]` | Controlled LineString route features. |
| `geoJson` | GeoJSON feature/collection | Additional point, line, or polygon data. |
| `heatMap` | `FeatureCollection<Point>` | Heat points; `properties.weight` is optional. |
| `clusterRadius` | `number` | `50`. Cluster radius in pixels. |
| `clusterMaxZoom` | `number` | `16`. Highest clustered zoom. |
| `selectedMarkerId` | `string` | Controlled selected marker id (reserved for feature state integrations). |
| `loadingLabel` | `string` | Loading overlay text. |
| `retryLabel` | `string` | Fatal-error retry button text. |
| `longPressDuration` | `number` | `550`. Mobile long-press threshold in milliseconds. |
| `children` | `ReactNode` | Custom overlays rendered above the map. |

### Modes

Supported values are `view`, `picker`, `editor`, `tracking`, `route`, `multiMarker`, `polygonEditor`, `circleEditor`, `deliveryZones`, `heatMap`, and `cluster`. Modes are an array, so combinations such as `['picker', 'cluster']` and `['view', 'route']` are valid.

- `picker` and `multiMarker` emit marker creation on an empty-map tap.
- `tracking` keeps the map centered when the GPS provider supports watching.
- `polygonEditor` collects taps and emits a polygon on double-tap after at least three vertices.
- `circleEditor` uses the first tap as center and the second as radius.
- Display-oriented modes are composed by supplying their corresponding controlled data.

### Toolbar

Each toolbar entry is `true`, `false`, or `{ enabled, label?, position? }`. Available ids are `gps`, `share`, `reset`, `close`, `recenter`, `zoom`, `compass`, `scale`, `fullscreen`, `layers`, `measure`, and `drawing`. `layers`, `measure`, and `drawing` are forward-compatible toolbar slots and intentionally have no built-in business workflow.

There is no `save` id. The package stores nothing, so a save button inside it would be a promise it cannot keep; the host saves whatever `onLocationCommitted` hands it.

```tsx
toolbar={{
  gps: { enabled: true, label: 'Locate me' },
  reset: true,
  zoom: true,
  close: false,
}}
```

## Events

All mutations are event-driven. Keep inputs controlled and write changes back from callbacks.

| Event | Payload / timing |
| --- | --- |
| `onReady` | MapLibre map immediately after construction. |
| `onMapLoaded` | Map after style and ASOL layers load. |
| `onLocationChanged` | Normalized GPS location. |
| `onMarkerAdded` | Marker proposed by picker interaction. |
| `onMarkerRemoved` | Marker removed by an editor integration. |
| `onMarkersChanged` | Proposed complete marker collection. |
| `onMarkerMoved` | Marker moved by a drag/editor integration. |
| `onMarkerSelected` | Selected marker, or `null`. |
| `onPolygonCreated`, `onPolygonEdited` | Created/edited GeoJSON polygon. |
| `onCircleCreated`, `onCircleEdited` | Created/edited centre/radius circle. |
| `onRouteCalculated` | Provider-neutral route result. |
| `onGpsStarted` | GPS request started. |
| `onGpsCompleted` | One-shot GPS request completed. |
| `onGpsError` | Normalized recoverable GPS error. |
| `onTap`, `onDoubleTap`, `onLongPress` | Geographic coordinates. |
| `onLocationCommitted` | Coordinates **and** the address the user confirmed in the balloon. |
| `onShare` | Current viewport when Share is activated. |
| `onReset`, `onClose` | Corresponding toolbar intent. |
| `onError` | `AsolMapError` from initialization, providers, GPS, routes, invalid data, or an unknown source. |

Errors contain `code`, human-readable `message`, optional `cause`, and `recoverable`. Fatal initialization errors show an accessible retry screen. Recoverable errors are emitted without destroying the map.

### Location permission

`code: 'permission'` is split out of `'gps'` because the host's response differs per case, and the
error carries `permissionState` (`denied` | `blocked` | `unsupported`) plus `requiresSettings`:

| State | Meaning | What the host should do |
| --- | --- | --- |
| `denied` | The user refused this time. | Explain and offer the map tap; asking again is allowed. |
| `blocked` | Refused permanently (`requiresSettings: true`). | Point at the OS app-settings screen; retrying alone cannot succeed. |
| `unsupported` | No location capability at all. | Fall back to picking on the map. |

`createNativePlatformGpsProvider` resolves the permission **before** any positioning call:
`NativeCore.checkPermission` → request when the state is `prompt` → throw `MapLocationPermissionError`
otherwise. Capacitor's Android and iOS bridges and the browser each reject with a different shape for
"no permission"; asking first collapses all three into one explicit decision, and it is what makes the
first tap on the GPS control actually raise the OS prompt instead of failing silently.

The address balloon does not open when GPS fails, so a refused permission never leaves an unnamed pin
behind. Native declarations back this: `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` in
`android/app/src/main/AndroidManifest.xml`, `NSLocationWhenInUseUsageDescription` in
`ios/App/App/Info.plist`.

## Marker and popup model

Markers are GeoJSON Point features with an id in `properties.id`. Optional properties include title, description, draggable, selected, color, image URL, and popup content. String popup values are inserted as text, not HTML, preventing accidental script injection. React nodes render through an isolated React root and are disposed with the popup.

```tsx
const marker: AsolMapMarker = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [31.2357, 30.0444] },
  properties: {
    id: 'cairo-store',
    title: 'Cairo store',
    color: '#d93025',
    popup: <StorePopup storeId="cairo-store" />,
  },
};
```

GeoJSON layers are the preferred rendering path for thousands of markers. They avoid thousands of React/DOM nodes and allow MapLibre worker-based tiling. Custom SVG, image, animated, HTML, or React marker presentation can be implemented as a feature overlay using `onReady` while preserving the same marker data contract; large sets should remain in the native layer.

## Address balloon

Picking a point is only half of an address. The balloon is the package's entire input surface for the
other half: choosing a point — by tapping the map or by using the GPS control — opens a popup anchored
to the pin with one text field. Confirming emits `onLocationCommitted` with the coordinates and the
text together; dismissing emits nothing, leaving the coordinates already reported by `onTap` /
`onGpsCompleted` as the only outcome. Tapping an existing marker reopens the balloon pre-filled, so an
address can be corrected without moving the pin.

The field lives on the pin rather than beside the map on purpose: a separate input can end up
describing a point the user has since moved, and the two are then saved as one record that is quietly
wrong. Hosts therefore render no address input of their own, and no "tap the map" instruction — the
balloon appearing on the pin *is* the instruction.

```tsx
<AsolMap
  modes={['picker']}
  providers={{ tile, gps }}
  markers={point ? [markerAt(point.longitude, point.latitude, id)] : []}
  addressPrompt={{
    enabled: true,
    title: 'عنوان هذا الموقع',
    placeholder: 'اكتب وصف العنوان',
    confirmLabel: 'تأكيد',
    cancelLabel: 'إلغاء',
    value: point?.address ?? '',
  }}
  onTap={({ latitude, longitude }) => setPoint({ ...point, latitude, longitude })}
  onLocationCommitted={({ latitude, longitude, address }) =>
    setPoint({ latitude, longitude, address })
  }
/>
```

`requireValue` defaults to `true`: Confirm stays disabled while the field is empty, because an empty
address is the one outcome the balloon exists to prevent. Set it to `false` where a bare coordinate is
acceptable.

## Controlled editing example

```tsx
const [markers, setMarkers] = useState<AsolMapMarker[]>([]);
const [polygons, setPolygons] = useState<AsolMapPolygon[]>([]);

<AsolMap
  providers={{ tile }}
  modes={['picker', 'multiMarker', 'polygonEditor', 'cluster']}
  markers={markers}
  polygons={polygons}
  onMarkersChanged={setMarkers}
  onPolygonCreated={(polygon) => setPolygons((items) => [...items, polygon])}
  toolbar={{ reset: true, gps: true, zoom: true }}
  onReset={() => { setMarkers([]); setPolygons([]); }}
/>
```

## Imperative handle

Attach a `ref<AsolMapHandle>` when a UI integration needs engine-level navigation:

| Method | Purpose |
| --- | --- |
| `getMap()` | Returns the MapLibre instance or `null`. Avoid using it for business state. |
| `flyTo(viewport)` | Animates to a partial viewport. |
| `fitBounds([west, south, east, north])` | Fits geographic bounds with padding. |
| `resize()` | Recalculates the canvas after a hidden panel/modal becomes visible. |
| `startGps()` | Starts one-shot GPS and tracking when configured. |
| `stopGps()` | Stops the active watcher. |

## Theme and layer updates

`light`, `dark`, and `auto` themes are supported. Provider style changes call `map.setStyle`; the MapLibre instance is retained, and ASOL sources/layers are restored after the new style loads. Theme colors may be overridden through `AsolMapTheme`. Controlled data updates call `GeoJSONSource.setData` and do not recreate the map or React component tree.

### Data-update timing

A `markers`, `polygons`, `circles`, or `routes` change is applied as soon as the
matching GeoJSON **source exists** — the sources are created by `addDataLayers` on
the map's `load` event. When the source is not there yet, the newest payload is
parked and flushed on the next `idle`, which is also the event that follows a
style swap re-adding every source. Only the latest payload per source is kept, so
a burst of updates costs one flush.

Updates are deliberately **not** gated on `map.isStyleLoaded()`. That flag is false
whenever any source still has a tile in flight — routine with live raster tiles and
guaranteed immediately after `flyTo` — so gating on it dropped the update silently
and never retried, because the effect only re-runs when the data prop itself
changes. The visible symptom was a marker picked by tapping the map or by the GPS
control never appearing.

## Performance

- Markers, polygons, routes, circles, heat points, and custom geometry use MapLibre GeoJSON sources.
- Clustering runs in MapLibre workers; `createClusterIndex` exposes standalone Supercluster spatial queries for feature logic.
- Memoize provider objects and large GeoJSON collections.
- Prefer one FeatureCollection update over many small DOM markers.
- Do not put rapidly changing map position in React state unless the feature needs it.
- Split exceptionally large datasets by semantic layer and load viewport-relevant chunks.

## Accessibility and gestures

The canvas is keyboard focusable and MapLibre keyboard navigation is enabled. Controls use native buttons, labels, visible focus rings, and a named toolbar. Loading and failure overlays use `status` and `alert` semantics. Reduced-motion preferences slow the loading animation.

Controls are a permanent vertical side rail pinned to the map's right edge, inside
the safe-area insets, at every screen size. They never reflow into a horizontal
strip: that layout consumed the top of the canvas and truncated every label. The
rail scales with the viewport instead — button box, icon, and label size are
`clamp()` ranges — and labels wrap to two lines rather than ellipsising, so
"مشاركة الموقع" stays readable at phone widths. A map shorter than 500px keeps the
rail vertical and only tightens it to a single label line. The rail scrolls
vertically when the toolbar has more entries than the map is tall.

Attribution stays in the bottom corner as the tile licence requires, rendered at
7px in dimmed white on a translucent dark plate so it remains legible over any
tile style without competing with the map.

Mouse wheel, keyboard, click, double-click, drag, pinch zoom, rotation, and touch gestures are handled by MapLibre. ASOL adds a cancellable one-finger long press. The root uses CSS safe-area insets for Capacitor and mobile-browser controls.

## Capacitor lifecycle checklist

1. Inject `createAdaptiveGpsProvider(Geolocation)` in the application/platform composition layer.
2. Add native location usage descriptions and permissions for Android and iOS.
3. Call `ref.current.resize()` after a hidden view becomes visible or after an orientation/layout transition when ResizeObserver cannot observe the intermediate state.
4. Stop background-sensitive tracking when the feature leaves the foreground unless the product explicitly implements an approved background-location flow.
5. Keep tile endpoints HTTPS for Android/iOS WebView security policies.

## Offline extension contract

Offline download is deliberately not implemented. The provider boundary permits a future provider to return local, cached, protocol-backed, or MBTiles-derived style sources. Tile caching, offline-region manifests, and storage policy belong in a provider/platform service; no feature component or geometry API needs to change.

## Security and operational notes

- Never interpolate untrusted HTML into popups. Strings are rendered with `textContent`.
- Preserve the provider attribution.
- Abort geocoding/routing requests when their owning UI closes.
- Treat precise location as sensitive data and request it only after explicit user intent.
- A tile provider is infrastructure: monitor availability, rate limits, CORS, and usage policy independently of the component.

## File location and public exports

Implementation: `packages/map-core/src/`. The single door is `@asol/map-core`.

The component is no longer re-exported from `@/components/ui`: a barrel would give the package a
second entry that the `exports` seal does not govern.

### Public surface

| Export | Kind |
| --- | --- |
| `AsolMap` | Component |
| `markerAt`, `circleToPolygon` | GeoJSON helpers |
| `createClusterIndex` | Supercluster index factory |
| `createOpenStreetMapProvider`, `createRasterTileProvider` | Tile providers |
| `createNativePlatformGpsProvider` | GPS provider |
| `MapLocationPermissionError` | Error class carrying `state` and `requiresSettings` |
| `types.ts` | The complete type contract |

`createBrowserGpsProvider` and `createAdaptiveGpsProvider` stay module-local in `gps.ts`: they reach
`navigator.geolocation` directly and would bypass the permission flow, GPS-disabled detection, and the
error taxonomy. `npm run test:map-core` asserts they are not exported.

## Consumers

| File | Use |
| --- | --- |
| `src/features/profile/presentation/contact-info/AdditionalContactView.tsx` | Store location picker with the address balloon |
| `src/features/product/presentation/ProductPropertySpecs.tsx` | Property location picker with the address balloon |
| `src/features/profile/presentation/contact-info/ContactInfoCard.contact-types.tsx` | Shared tile and GPS provider singletons |
