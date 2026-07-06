import type { StyleSpecification } from 'maplibre-gl';
import type { TileProvider } from './types';

export interface RasterTileProviderOptions { id?: string; tiles: string[]; attribution: string; tileSize?: number; minZoom?: number; maxZoom?: number; lightBackground?: string; darkBackground?: string }

/** Creates a keyless raster provider. URLs remain configuration, never UI knowledge. */
export function createRasterTileProvider(options: RasterTileProviderOptions): TileProvider {
  return {
    id: options.id ?? 'raster', attribution: options.attribution,
    getStyle(theme): StyleSpecification {
      return {
        version: 8,
        sources: { base: { type: 'raster', tiles: options.tiles, tileSize: options.tileSize ?? 256, minzoom: options.minZoom ?? 0, maxzoom: options.maxZoom ?? 19, attribution: options.attribution } },
        layers: [
          { id: 'gova-background', type: 'background', paint: { 'background-color': theme === 'dark' ? (options.darkBackground ?? '#17191c') : (options.lightBackground ?? '#eef1f4') } },
          { id: 'gova-base-map', type: 'raster', source: 'base' },
        ],
      };
    },
  };
}

export const createOpenStreetMapProvider = (overrides: Partial<RasterTileProviderOptions> = {}): TileProvider => createRasterTileProvider({
  id: 'openstreetmap', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
  attribution: '© OpenStreetMap contributors', maxZoom: 19, ...overrides,
});
