import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(
  path.join(
    process.cwd(),
    'src/features/product/ports/pharmacy-product-lookup.port.ts',
  ),
  'utf8',
);

assert.match(
  source,
  /globalThis as PharmacyProductLookupPortRegistry/,
  'PharmacyProductLookupPort must persist outside module scope so a dev module reload cannot erase the composition-root registration.',
);
assert.match(source, /__asolPharmacyProductLookupPort/);
assert.doesNotMatch(
  source,
  /let\s+pharmacyProductLookupPort\s*:/,
  'Do not restore module-local port state; Turbopack may reload this module without rerunning instrumentation.',
);

console.log('Pharmacy product lookup port registry test passed.');
