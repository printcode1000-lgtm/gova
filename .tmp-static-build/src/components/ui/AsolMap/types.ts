import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, Point, Polygon } from 'geojson';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import type { ReactNode } from 'react';

export type AsolMapMode = 'view' | 'picker' | 'editor' | 'tracking' | 'route' | 'multiMarker' | 'polygonEditor' | 'circleEditor' | 'deliveryZones' | 'heatMap' | 'cluster';
export type AsolMapThemeName = 'light' | 'dark' | 'auto';
export type AsolMapLayerId = 'baseMap' | 'markers' | 'clusters' | 'routes' | 'circles' | 'polygons' | 'heatMap' | 'popup' | 'controls';
export type AsolMapControlId = 'save' | 'gps' | 'share' | 'reset' | 'close' | 'recenter' | 'zoom' | 'compass' | 'scale' | 'fullscreen' | 'layers' | 'measure' | 'drawing';

export interface Coordinates { latitude: number; longitude: number }
export interface AsolMapViewport extends Coordinates { zoom: number; bearing?: number; pitch?: number }
export interface AsolMapLocation extends Coordinates { accuracy: number; heading: number | null; speed: number | null; timestamp: number; source: 'browser' | 'capacitor' | 'native' }
export interface AsolMapError { code: 'initialization' | 'gps' | 'provider' | 'route' | 'invalid-data' | 'unknown'; message: string; cause?: unknown; recoverable: boolean }

export interface AsolMapMarkerProperties {
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
export type AsolMapMarker = Feature<Point, AsolMapMarkerProperties>;
export type AsolMapPolygon = Feature<Polygon, GeoJsonProperties & { id: string }>;
export type AsolMapRoute = Feature<LineString, GeoJsonProperties & { id: string }>;
export interface AsolMapCircle extends Coordinates { id: string; radiusMeters: number; color?: string; properties?: GeoJsonProperties }

export interface TileProvider { id: string; attribution: string; getStyle(theme: Exclude<AsolMapThemeName, 'auto'>): StyleSpecification | Promise<StyleSpecification>; transformRequest?: (url: string, resourceType?: string) => { url: string; headers?: Record<string, string> } }
export interface GeocoderResult extends Coordinates { id: string; label: string; bounds?: [number, number, number, number]; raw?: unknown }
export interface GeocoderProvider { id: string; forward(query: string, signal?: AbortSignal): Promise<GeocoderResult[]>; reverse(coordinates: Coordinates, signal?: AbortSignal): Promise<GeocoderResult[]> }
export interface RouteRequest { origin: Coordinates; destination: Coordinates; waypoints?: Coordinates[]; profile?: 'driving' | 'walking' | 'cycling'; signal?: AbortSignal }
export interface RouteResult { id: string; geometry: Feature<LineString>; distanceMeters: number; durationSeconds: number; raw?: unknown }
export interface RoutingProvider { id: string; calculate(request: RouteRequest): Promise<RouteResult> }
export interface ElevationProvider { id: string; getElevations(coordinates: Coordinates[], signal?: AbortSignal): Promise<number[]> }
export interface GpsProvider { id: string; isAvailable(): boolean | Promise<boolean>; getCurrentPosition(options?: PositionOptions): Promise<AsolMapLocation>; watchPosition?(onLocation: (location: AsolMapLocation) => void, onError: (error: unknown) => void, options?: PositionOptions): Promise<() => void> | (() => void) }

export interface AsolMapProviders { tile: TileProvider; geocoder?: GeocoderProvider; routing?: RoutingProvider; elevation?: ElevationProvider; gps?: GpsProvider }
export interface ToolbarItemConfig { enabled: boolean; label?: string; position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }
export type ToolbarConfig = Partial<Record<AsolMapControlId, boolean | ToolbarItemConfig>>;
export type LayerConfig = Partial<Record<AsolMapLayerId, boolean>>;
export interface AsolMapTheme { name: AsolMapThemeName; markerColor?: string; routeColor?: string; polygonFill?: string; circleFill?: string; clusterColor?: string; className?: string }

export interface AsolMapHandle { getMap(): MapLibreMap | null; flyTo(viewport: Partial<AsolMapViewport>): void; fitBounds(bounds: [number, number, number, number]): void; resize(): void; startGps(): Promise<void>; stopGps(): void }

export interface AsolMapProps {
  id?: string; className?: string; style?: React.CSSProperties; ariaLabel?: string;
  modes?: AsolMapMode[]; initialViewport?: AsolMapViewport; minZoom?: number; maxZoom?: number;
  providers: AsolMapProviders; toolbar?: ToolbarConfig; layers?: LayerConfig; theme?: AsolMapTheme;
  routeRequest?: RouteRequest;
  markers?: AsolMapMarker[]; polygons?: AsolMapPolygon[]; circles?: AsolMapCircle[]; routes?: AsolMapRoute[];
  geoJson?: FeatureCollection | Feature<Geometry>; heatMap?: FeatureCollection<Point>; clusterRadius?: number; clusterMaxZoom?: number;
  selectedMarkerId?: string; loadingLabel?: string; retryLabel?: string; longPressDuration?: number;
  children?: ReactNode;
  onReady?: (map: MapLibreMap) => void; onMapLoaded?: (map: MapLibreMap) => void;
  onLocationChanged?: (location: AsolMapLocation) => void;
  onMarkerAdded?: (marker: AsolMapMarker) => void; onMarkerRemoved?: (marker: AsolMapMarker) => void;
  onMarkersChanged?: (markers: AsolMapMarker[]) => void; onMarkerMoved?: (marker: AsolMapMarker) => void;
  onMarkerSelected?: (marker: AsolMapMarker | null) => void;
  onPolygonCreated?: (polygon: AsolMapPolygon) => void; onPolygonEdited?: (polygon: AsolMapPolygon) => void;
  onCircleCreated?: (circle: AsolMapCircle) => void; onCircleEdited?: (circle: AsolMapCircle) => void;
  onRouteCalculated?: (route: RouteResult) => void;
  onGpsStarted?: () => void; onGpsCompleted?: (location: AsolMapLocation) => void; onGpsError?: (error: AsolMapError) => void;
  onTap?: (coordinates: Coordinates) => void; onDoubleTap?: (coordinates: Coordinates) => void; onLongPress?: (coordinates: Coordinates) => void;
  onShare?: (viewport: AsolMapViewport) => void; onSave?: () => void; onReset?: () => void; onClose?: () => void; onError?: (error: AsolMapError) => void;
}
