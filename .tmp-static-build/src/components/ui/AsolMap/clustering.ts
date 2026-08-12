import Supercluster from 'supercluster';
import type { Feature, Point } from 'geojson';
import type { AsolMapMarker, AsolMapMarkerProperties } from './types';

export function createClusterIndex(markers: AsolMapMarker[], options: { radius?: number; maxZoom?: number } = {}) {
  const index = new Supercluster<AsolMapMarkerProperties, { count: number }>({ radius: options.radius ?? 50, maxZoom: options.maxZoom ?? 16 });
  index.load(markers as Feature<Point, AsolMapMarkerProperties>[]);
  return index;
}
