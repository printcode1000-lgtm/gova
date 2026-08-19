import fs from 'node:fs';
import path from 'node:path';

import {
  resolveCatalogRoots,
  validateCatalogV3,
} from '@asol/catalog-core/server';

const root = process.cwd();
const { publicRoot, catalogRoot } = resolveCatalogRoots(root);

const schemaSource = fs.readFileSync(
  path.join(root, 'packages/data-core/src/core/database/profile/user-specialties.schema.ts'),
  'utf8',
);
const expectedDatabaseColumns = new Set(
  [...schemaSource.matchAll(/^\s{2}[a-z0-9_]+: integer\("([a-z0-9_]+)"\)/gm)].map(
    (match) => match[1],
  ),
);

const { errors, warnings, summary } = validateCatalogV3({
  catalogRoot,
  publicRoot,
  expectedDatabaseColumns,
});

if (warnings.length) warnings.forEach((warning) => console.warn(`WARN: ${warning}`));
if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
console.log('Catalog v3 is valid.');
