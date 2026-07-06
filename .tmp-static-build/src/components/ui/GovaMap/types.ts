import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, Point, Polygon } from 'geojson';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import type { ReactNode } from 'react';

export type GovaMapMode = 'view' | 'picker' | 'editor' | 'tracking' | 'route' | 'multiMarker' | 'polygonEditor' | 'circleEditor' | 'deliveryZones' | 'heatMap' | 'cluster';
export type GovaMapThemeName = 'light' | 'dark' | 'auto';
export type GovaMapLayerId = 'baseMap' | 'markers' | 'clusters' | 'routes' | 'circles' | 'polygons' | 'heatMap' | 'popup' | 'controls';
export type GovaMapControlId = 'save' | 'gps' | 'share' | 'reset' | 'close' | 'recenter' | 'zoom' | 'compass' | 'scale' | 'fullscreen' | 'layers' | 'measure' | 'drawing';

export interface Coordinates { latitude: number; longitude: number }
export interface GovaMapViewport extends Coordinates { zoom: number; bearing?: number; pitch?: number }
export interface GovaMapLocation extends Coordinates { accuracy: number; heading: number | null; speed: number | null; timestamp: number; source: 'browser' | 'capacitor' | 'native' }
export interface GovaMapError { code: 'initialization' | 'gps' | 'provider' | 'route' | 'invalid-data' | 'unknown'; message: string; cause?: unknown; recoverable: boolean }

export interface GovaMapMarkerProperties {
  [key: string]: unknown;
  id: string;
  title?: string;
  description?: string;
  draggable?: boolean;
  selected?: boolean;
  color?: string;
  imageUrl?: string;
  popup?: ReactNode | string;
}
export type GovaMapMarker = Feature<Point, GovaMapMarkerProperties>;
export type GovaMapPolygon = Feature<Polygon, GeoJsonProperties & { id: string }>;
export type GovaMapRoute = Feature<LineString, GeoJsonProperties & { id: string }>;
export interface GovaMapCircle extends Coordinates { id: string; radiusMeters: number; color?: string; properties?: GeoJsonProperties }

export interface TileProvider { id: string; attribution: string; getStyle(theme: Exclude<GovaMapThemeName, 'auto'>): StyleSpecification | Promise<StyleSpecification>; transformRequest?: (url: string, resourceType?: string) => { url: string; headers?: Record<string, string> } }
export interface GeocoderResult extends Coordinates { id: string; label: string; bounds?: [number, number, number, number]; raw?: unknown }
export interface GeocoderProvider { id: string; forward(query: string, signal?: AbortSignal): Promise<GeocoderResult[]>; reverse(coordinates: Coordinates, signal?: AbortSignal): Promise<GeocoderResult[]> }
export interface RouteRequest { origin: Coordinates; destination: Coordinates; waypoints?: Coordinates[]; profile?: 'driving' | 'walking' | 'cycling'; signal?: AbortSignal }
export interface RouteResult { id: string; geometry: Feature<LineString>; distanceMeters: number; durationSeconds: number; raw?: unknown }
export interface RoutingProvider { id: string; calculate(request: RouteRequest): Promise<RouteResult> }
export interface ElevationProvider { id: string; getElevations(coordinates: Coordinates[], signal?: AbortSignal): Promise<number[]> }
export interface GpsProvider { id: string; isAvailable(): boolean | Promise<boolean>; getCurrentPosition(options?: PositionOptions): Promise<GovaMapLocation>; watchPosition?(onLocation: (location: GovaMapLocation) => void, onError: (error: unknown) => void, options?: PositionOptions): Promise<() => void> | (() => void) }

export interface GovaMapProviders { tile: TileProvider; geocoder?: GeocoderProvider; routing?: RoutingProvider; elevation?: ElevationProvider; gps?: GpsProvider }
export interface ToolbarItemConfig { enabled: boolean; label?: string; position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }
export type ToolbarConfig = Partial<Record<GovaMapControlId, boolean | ToolbarItemConfig>>;
export type LayerConfig = Partial<Record<GovaMapLayerId, boolean>>;
export interface GovaMapTheme { name: GovaMapThemeName; markerColor?: string; routeColor?: string; polygonFill?: string; circleFill?: string; clusterColor?: string; className?: string }

export interface GovaMapHandle { getMap(): MapLibreMap | null; flyTo(viewport: Partial<GovaMapViewport>): void; fitBounds(bounds: [number, number, number, number]): void; resize(): void; startGps(): Promise<void>; stopGps(): void }

export interface GovaMapProps {
  id?: string; className?: string; style?: React.CSSProperties; ariaLabel?: string;
  modes?: GovaMapMode[]; initialViewport?: GovaMapViewport; minZoom?: number; maxZoom?: number;
  providers: GovaMapProviders; toolbar?: ToolbarConfig; layers?: LayerConfig; theme?: GovaMapTheme;
  routeRequest?: RouteRequest;
  markers?: GovaMapMarker[]; polygons?: GovaMapPolygon[]; circles?: GovaMapCircle[]; routes?: GovaMapRoute[];
  geoJson?: FeatureCollection | Feature<Geometry>; heatMap?: FeatureCollection<Point>; clusterRadius?: number; clusterMaxZoom?: number;
  selectedMarkerId?: string; loadingLabel?: string; retryLabel?: string; longPressDuration?: number;
  children?: ReactNode;
  onReady?: (map: MapLibreMap) => void; onMapLoaded?: (map: MapLibreMap) => void;
  onLocationChanged?: (location: GovaMapLocation) => void;
  onMarkerAdded?: (marker: GovaMapMarker) => void; onMarkerRemoved?: (marker: GovaMapMarker) => void;
  onMarkersChanged?: (markers: GovaMapMarker[]) => void; onMarkerMoved?: (marker: GovaMapMarker) => void;
  onMarkerSelected?: (marker: GovaMapMarker | null) => void;
  onPolygonCreated?: (polygon: GovaMapPolygon) => void; onPolygonEdited?: (polygon: GovaMapPolygon) => void;
  onCircleCreated?: (circle: GovaMapCircle) => void; onCircleEdited?: (circle: GovaMapCircle) => void;
  onRouteCalculated?: (route: RouteResult) => void;
  onGpsStarted?: () => void; onGpsCompleted?: (location: GovaMapLocation) => void; onGpsError?: (error: GovaMapError) => void;
  onTap?: (coordinates: Coordinates) => void; onDoubleTap?: (coordinates: Coordinates) => void; onLongPress?: (coordinates: Coordinates) => void;
  onShare?: (viewport: GovaMapViewport) => void; onSave?: () => void; onReset?: () => void; onClose?: () => void; onError?: (error: GovaMapError) => void;
}
