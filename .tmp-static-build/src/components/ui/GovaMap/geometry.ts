import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import type { GovaMapCircle, GovaMapMarker, GovaMapPolygon, GovaMapRoute } from './types';

export const collection = <G extends GeoJSON.Geometry, P extends GeoJSON.GeoJsonProperties>(features: Feature<G, P>[]): FeatureCollection<G, P> => ({ type: 'FeatureCollection', features });

export function circleToPolygon(circle: GovaMapCircle, steps = 64): Feature<Polygon> {
  const coordinates: [number, number][] = [];
  const latRadians = circle.latitude * Math.PI / 180;
  for (let i = 0; i <= steps; i += 1) {
    const angle = i * 2 * Math.PI / steps;
    const latitude = circle.latitude + (circle.radiusMeters / 111_320) * Math.sin(angle);
    const longitude = circle.longitude + (circle.radiusMeters / (111_320 * Math.cos(latRadians))) * Math.cos(angle);
    coordinates.push([longitude, latitude]);
  }
  return { type: 'Feature', id: circle.id, properties: { ...circle.properties, id: circle.id, radiusMeters: circle.radiusMeters, color: circle.color }, geometry: { type: 'Polygon', coordinates: [coordinates] } };
}

export const markerAt = (longitude: number, latitude: number, id = globalThis.crypto?.randomUUID?.() ?? `marker-${Date.now()}`): GovaMapMarker => ({ type: 'Feature', id, properties: { id }, geometry: { type: 'Point', coordinates: [longitude, latitude] } });
export const emptyMarkers = (): FeatureCollection<Point> => collection<GovaMapMarker['geometry'], GovaMapMarker['properties']>([]);
export const polygonsCollection = (items: GovaMapPolygon[]) => collection(items);
export const routesCollection = (items: GovaMapRoute[]) => collection(items);
