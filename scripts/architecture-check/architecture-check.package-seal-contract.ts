import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { addViolation, extractImports, rel } from './architecture-check.architecture-types';

/**
 * Rule 5, layer 3 — the repository-wide scan, for every sealed package at once.
 *
 * `native-core`, `storage-core` and `account-bridge` each got a hand-written contract
 * file; the other eight packages got none, so their `exports` seal rested on
 * `package.json` and ESLint alone — both of which a relative path walks straight past.
 * A per-package file would have meant eight more files drifting apart, so this one reads
 * each package's own `exports` map and enforces whatever it declares.
 *
 * Two things are banned repository-wide:
 *
 *   1. importing a package through a door it does not declare;
 *   2. reaching a package by relative path, which never consults `exports` at all.
 *
 * The second is the one that actually happened: 19 imports of the form
 * `../packages/vercel-deploy-core/src/index` made the seal decorative while every
 * declared door looked correct.
 */

const PACKAGES_ROOT = path.join(process.cwd(), 'packages');

interface PackageSeal {
  name: string;
  doors: Set<string>;
}

function loadSeals(): PackageSeal[] {
  if (!existsSync(PACKAGES_ROOT)) return [];
  const seals: PackageSeal[] = [];
  for (const entry of readdirSync(PACKAGES_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(PACKAGES_ROOT, entry.name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      name?: string;
      exports?: Record<string, unknown>;
    };
    if (!manifest.name?.startsWith('@asol/')) continue;
    const doors = new Set<string>();
    for (const door of Object.keys(manifest.exports ?? {})) {
      doors.add(door === '.' ? manifest.name : `${manifest.name}/${door.slice(2)}`);
    }
    seals.push({ name: manifest.name, doors });
  }
  return seals;
}

const SEALS = loadSeals();

export function checkPackageSealContract(filePath: string, content: string): void {
  const fileRel = rel(filePath);

  for (const specifier of extractImports(content)) {
    // 1. A declared package, reached through an undeclared door.
    const seal = SEALS.find(
      (candidate) => specifier === candidate.name || specifier.startsWith(`${candidate.name}/`),
    );
    if (seal && !seal.doors.has(specifier)) {
      addViolation(
        'Rule 5 Package Seal',
        filePath,
        `${fileRel} imports "${specifier}", which is not a declared door of ${seal.name}.`,
        `Declared doors: ${[...seal.doors].sort().join(', ')}. Deep imports bypass the exports seal.`,
      );
    }

    // 2. Any relative path that lands inside packages/. A relative specifier never
    //    consults `exports`, so this is the hole the seal cannot see by itself.
    if (!specifier.startsWith('.')) continue;
    const resolved = path.resolve(path.dirname(filePath), specifier);
    if (!resolved.startsWith(PACKAGES_ROOT)) continue;

    const owningPackage = path.relative(PACKAGES_ROOT, resolved).split(path.sep)[0];
    const importerInSamePackage =
      filePath.startsWith(PACKAGES_ROOT) &&
      path.relative(PACKAGES_ROOT, filePath).split(path.sep)[0] === owningPackage;
    // Inside its own package a relative import is just a normal internal import.
    if (importerInSamePackage) continue;

    addViolation(
      'Rule 5 Package Seal',
      filePath,
      `${fileRel} reaches into packages/${owningPackage} by relative path "${specifier}".`,
      `A relative path never consults the package's exports map. Import "@asol/${owningPackage}" instead.`,
    );
  }
}
