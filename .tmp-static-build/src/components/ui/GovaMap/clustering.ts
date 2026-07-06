import Supercluster from 'supercluster';
import type { Feature, Point } from 'geojson';
import type { GovaMapMarker, GovaMapMarkerProperties } from './types';

export function createClusterIndex(markers: GovaMapMarker[], options: { radius?: number; maxZoom?: number } = {}) {
  const index = new Supercluster<GovaMapMarkerProperties, { count: number }>({ radius: options.radius ?? 50, maxZoom: options.maxZoom ?? 16 });
  index.load(markers as Feature<Point, GovaMapMarkerProperties>[]);
  return index;
}
