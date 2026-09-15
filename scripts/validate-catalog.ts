import fs from 'node:fs';
import path from 'node:path';

import {
  resolveCatalogRoots,
  validateCatalogV3,
} from '@asol/catalog-core/server';
import { readDesiredSchema } from '@asol/data-core/provisioning';

const root = process.cwd();
const { publicRoot, catalogRoot } = resolveCatalogRoots(root);

const specialtyTable = readDesiredSchema('profile-core').tables.user_specialties;
if (!specialtyTable) throw new Error('user_specialties desired schema is missing');
const expectedDatabaseColumns = new Set(
  specialtyTable.columns.map((column) => column.name).filter((name) => name !== 'uid'),
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
