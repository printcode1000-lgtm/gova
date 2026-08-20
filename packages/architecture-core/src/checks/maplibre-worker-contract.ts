import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, addViolation } from './architecture-types';

/**
 * MapLibre resolves its worker relative to `import.meta.url`, which inside a Next
 * bundle points at the emitted chunk — so the default resolution 404s and the
 * worker never starts. Without the worker every GeoJSON source stays untiled and
 * no marker, polygon, circle or route is ever painted, while raster tiles keep
 * drawing and hide the failure.
 *
 * `AsolMap` therefore pins the worker to a copy we serve ourselves. This check
 * keeps that copy present, byte-identical to the installed package, and actually
 * referenced — the same contract the IndexedDB push worker already follows.
 */
/**
 * The worker plus every sibling it imports at runtime. The worker is not
 * self-contained: shipping it without `maplibre-gl-shared.mjs` reproduces the same
 * 404-as-HTML failure one import deeper, so both files are part of the contract.
 * Keep in step with MAPLIBRE_WORKER_FILES in scripts/sync-maplibre-worker.ts.
 */
const WORKER_FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'] as const;
const MAP_COMPONENT = join(ROOT, 'packages', 'map-core', 'src', 'AsolMap.tsx');
const EXPECTED_WORKER_URL = '"/maplibre-gl-worker.mjs"';

export function checkMapLibreWorkerContract(): void {
  for (const name of WORKER_FILES) {
    const source = join(ROOT, 'node_modules', 'maplibre-gl', 'dist', name);
    const served = join(ROOT, 'public', name);

    if (!existsSync(served)) {
      addViolation(
        'shared',
        `public/${name}`,
        'A MapLibre worker artifact is missing; every GeoJSON layer (markers, polygons, routes) would silently render nothing.',
        'Run npm run maplibre:sync.',
      );
      continue;
    }

    if (
      existsSync(source) &&
      readFileSync(source, 'utf8') !== readFileSync(served, 'utf8')
    ) {
      addViolation(
        'shared',
        `public/${name}`,
        'A served MapLibre worker artifact differs from the installed maplibre-gl package.',
        'Run npm run maplibre:sync.',
      );
    }
  }

  if (!existsSync(MAP_COMPONENT)) return;

  const component = readFileSync(MAP_COMPONENT, 'utf8');
  if (!component.includes('setWorkerUrl') || !component.includes(EXPECTED_WORKER_URL)) {
    addViolation(
      'shared',
      'packages/map-core/src/AsolMap.tsx',
      'AsolMap must call setWorkerUrl("/maplibre-gl-worker.mjs"); the bundler-resolved default 404s and disables every GeoJSON layer.',
      'See docs/01-architecture/map-core-module.md.',
    );
  }
}
