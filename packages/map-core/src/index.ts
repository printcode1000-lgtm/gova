export { AsolMap } from './AsolMap';
export { createClusterIndex } from './clustering';
export { circleToPolygon, markerAt } from './geometry';
/**
 * The Native Platform provider is the only GPS provider exposed publicly.
 *
 * `createBrowserGpsProvider` and `createAdaptiveGpsProvider` stay module-local
 * in `./gps`: they reach `navigator.geolocation` directly and would bypass the
 * layer's permission handling, GPS-disabled detection, and error taxonomy.
 * Import them by path only, and only from a test.
 */
export { createNativePlatformGpsProvider, MapLocationPermissionError } from './native-platform-gps';
export { createOpenStreetMapProvider, createRasterTileProvider } from './providers';
export type * from './types';
