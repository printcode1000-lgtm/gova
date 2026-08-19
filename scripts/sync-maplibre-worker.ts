import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * MapLibre 6 resolves its worker as `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
 * Inside a Next.js bundle `import.meta.url` is the emitted chunk URL, so the request
 * lands on `/_next/static/chunks/maplibre-gl-worker.mjs`, which does not exist — Next
 * answers with its HTML 404 page and the browser refuses it:
 *
 *   Failed to load module script: the server responded with a non-JavaScript MIME
 *   type of "text/html".
 *
 * The map still draws, because raster tiles never touch the worker. Everything the
 * worker tiles — every GeoJSON source, which is how ASOL renders markers, polygons,
 * circles and routes — silently produces nothing. The visible symptom is a location
 * pin that never appears.
 *
 * The fix is to serve the worker ourselves from `public/` and point MapLibre at it
 * with `setWorkerUrl`. The worker is not self-contained: it does
 * `import ... from './maplibre-gl-shared.mjs'`, so that sibling must be served from
 * the same directory or the worker fails on exactly the same 404-as-HTML. Both files
 * are kept byte-identical to the installed package, the same contract
 * `asol-push-sw.js` already uses, and `npm run architecture:check` fails on drift.
 */
const ROOT = process.cwd();

/** The worker plus every sibling it imports at runtime. */
export const MAPLIBRE_WORKER_FILES = [
  'maplibre-gl-worker.mjs',
  'maplibre-gl-shared.mjs',
] as const;

const packageFile = (name: string) =>
  join(ROOT, 'node_modules', 'maplibre-gl', 'dist', name);
const publicFile = (name: string) => join(ROOT, 'public', name);

export function syncMapLibreWorker(): 'copied' | 'unchanged' {
  let copied = false;

  for (const name of MAPLIBRE_WORKER_FILES) {
    const source = packageFile(name);
    if (!existsSync(source)) {
      throw new Error(`maplibre-gl asset not found at ${source}. Run npm install first.`);
    }

    const target = publicFile(name);
    if (
      existsSync(target) &&
      readFileSync(source, 'utf8') === readFileSync(target, 'utf8')
    ) {
      continue;
    }

    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    copied = true;
  }

  return copied ? 'copied' : 'unchanged';
}

const result = syncMapLibreWorker();
console.log(
  result === 'copied'
    ? '✅ Wrote ./public/maplibre-gl-worker.mjs (+ shared runtime)'
    : 'MapLibre worker already in sync; nothing rewritten.',
);
