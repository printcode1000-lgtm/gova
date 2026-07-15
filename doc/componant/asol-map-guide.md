# AsolMap

`AsolMap` is ASOL's shared, provider-agnostic mapping platform. It uses MapLibre GL JS, GeoJSON, OpenStreetMap-compatible tiles, and Supercluster. It has no Mapbox, Google Maps, paid SDK, or map-engine API-key requirement.

## Installation and import

The dependencies are part of the application package. Import the component and only the factories/types that a feature needs:

```tsx
import {
  AsolMap,
  createOpenStreetMapProvider,
  type AsolMapMarker,
} from '@/components/ui/AsolMap';
```

`AsolMap` is a client component. A server component may render a client wrapper that contains it. No `ssr: false` dynamic import is required.

## Minimal example

```tsx
'use client';

import { useMemo } from 'react';
import { AsolMap, createOpenStreetMapProvider } from '@/components/ui/AsolMap';

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
| `AsolMap.tsx` | Map engine lifecycle, event translation, layer orchestration, and recovery UI |
| `providers.ts` | Tile-provider contracts and raster/OSM provider factories |
| `gps.ts` | Browser and native/Capacitor geolocation adapters |
| `AsolMapControls.tsx` | Accessible independent controls |
| `geometry.ts` | Pure GeoJSON and circle conversion utilities |
| `clustering.ts` | Reusable Supercluster spatial index |
| `theme.ts` | Theme resolution and map color defaults |
| `types.ts` | Complete public contract |
| `AsolMap.css` | Responsive, safe-area-aware presentation |

Features must import this component instead of creating MapLibre instances directly. Business behavior belongs in feature callbacks, not in `AsolMap`.

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
import { createAdaptiveGpsProvider } from '@/components/ui/AsolMap';

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

Each toolbar entry is `true`, `false`, or `{ enabled, label?, position? }`. Available ids are `save`, `gps`, `share`, `reset`, `close`, `recenter`, `zoom`, `compass`, `scale`, `fullscreen`, `layers`, `measure`, and `drawing`. `layers`, `measure`, and `drawing` are forward-compatible toolbar slots and intentionally have no built-in business workflow.

```tsx
toolbar={{
  save: { enabled: true, label: 'Save delivery area' },
  gps: true,
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
| `onShare` | Current viewport when Share is activated. |
| `onSave`, `onReset`, `onClose` | Corresponding toolbar intent. |
| `onError` | `AsolMapError` from initialization, providers, GPS, routes, invalid data, or an unknown source. |

Errors contain `code`, human-readable `message`, optional `cause`, and `recoverable`. Fatal initialization errors show an accessible retry screen. Recoverable errors are emitted without destroying the map.

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
  toolbar={{ save: true, reset: true, gps: true, zoom: true }}
  onReset={() => { setMarkers([]); setPolygons([]); }}
  onSave={() => saveGeoJson({ markers, polygons })}
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

## Performance

- Markers, polygons, routes, circles, heat points, and custom geometry use MapLibre GeoJSON sources.
- Clustering runs in MapLibre workers; `createClusterIndex` exposes standalone Supercluster spatial queries for feature logic.
- Memoize provider objects and large GeoJSON collections.
- Prefer one FeatureCollection update over many small DOM markers.
- Do not put rapidly changing map position in React state unless the feature needs it.
- Split exceptionally large datasets by semantic layer and load viewport-relevant chunks.

## Accessibility and gestures

The canvas is keyboard focusable and MapLibre keyboard navigation is enabled. Controls use native buttons, labels, visible focus rings, and a named toolbar. Loading and failure overlays use `status` and `alert` semantics. Reduced-motion preferences slow the loading animation.

Controls are vertical on wider displays. On phones and short landscape screens they become a safe-area-aware horizontal strip with touch scrolling and 44px minimum targets, preventing the toolbar from covering the full map or overflowing its container.

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

Implementation: `src/components/ui/AsolMap/`. Public exports are available from both `@/components/ui/AsolMap` and `@/components/ui`.
