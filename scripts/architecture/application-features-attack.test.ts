/**
 * Adversarial architecture attacks — prove the new model rejects bypasses.
 * Uses only the public `@asol/architecture-core` door.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATION_FEATURES,
  CAPABILITY_PACKAGES,
  checkApplicationFeatureRegistryContract,
  checkArchitectureDocsDriftContract,
  checkFeatureApplicationDoorPurityContract,
  checkFeatureDoorContract,
  checkPackageSealContract,
  diffArchitectureDocs,
  renderArchitectureDoc,
  violations,
  writeArchitectureDocs,
} from '@asol/architecture-core';

const ROOT = process.cwd();

function clearViolations(): void {
  violations.length = 0;
}

function hasViolationMatching(re: RegExp): boolean {
  return violations.some((v) => re.test(`${v.layer} ${v.violation} ${v.file}`));
}

// ── 1. Unregistered feature directory ───────────────────────────────────────
{
  clearViolations();
  const fake = join(ROOT, 'src/features/fake-feature');
  mkdirSync(fake, { recursive: true });
  writeFileSync(join(fake, 'index.ts'), 'export {};\n');
  try {
    checkApplicationFeatureRegistryContract();
    assert.ok(hasViolationMatching(/fake-feature/i), 'Unregistered feature must fail');
  } finally {
    rmSync(fake, { recursive: true, force: true });
  }
}

// ── 2. Recreation of src/modules/ ───────────────────────────────────────────
{
  clearViolations();
  const modules = join(ROOT, 'src/modules');
  mkdirSync(modules, { recursive: true });
  writeFileSync(join(modules, 'marker.ts'), 'export {};\n');
  try {
    checkApplicationFeatureRegistryContract();
    assert.ok(hasViolationMatching(/src\/modules/i), 'src/modules must fail');
  } finally {
    rmSync(modules, { recursive: true, force: true });
  }
}

// ── 3. Unknown top-level application directory ──────────────────────────────
{
  clearViolations();
  const unknown = join(ROOT, 'src/legacy-bucket');
  mkdirSync(unknown, { recursive: true });
  writeFileSync(join(unknown, 'x.ts'), 'export {};\n');
  try {
    checkApplicationFeatureRegistryContract();
    assert.ok(hasViolationMatching(/legacy-bucket/i), 'unknown root must fail');
  } finally {
    rmSync(unknown, { recursive: true, force: true });
  }
}

// ── 4. Deep cross-feature import bypassing a door ───────────────────────────
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_probe.ts');
  writeFileSync(
    probe,
    "import { something } from '@/features/auth/domain/session.entity';\nexport const x = something;\n",
  );
  try {
    checkFeatureDoorContract();
    assert.ok(
      hasViolationMatching(/Deep cross-feature import|session\.entity/i),
      'Deep cross-feature import must fail',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

// ── 5. Feature dependency not allowed by registry ───────────────────────────
{
  clearViolations();
  const importer = APPLICATION_FEATURES.find(
    (f) => f.name === 'qr-code' || f.permittedDependencies.length === 0,
  );
  assert.ok(importer, 'Need a low-dependency feature');
  const target = APPLICATION_FEATURES.find(
    (f) => f.name !== importer!.name && !importer!.permittedDependencies.includes(f.name),
  );
  assert.ok(target, 'Need an unpermitted target');
  const probe = join(ROOT, importer!.sourcePath, '__architecture_attack_dep.ts');
  writeFileSync(probe, `import {} from '@/features/${target!.name}';\n`);
  try {
    checkFeatureDoorContract();
    assert.ok(
      hasViolationMatching(/not permitted|permittedDependencies/i),
      'Unpermitted dependency must fail',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

// ── 6. Registry entry pointing at a missing feature ─────────────────────────
{
  clearViolations();
  const sample = APPLICATION_FEATURES[0]!;
  const path = join(ROOT, sample.sourcePath);
  const parked = `${path}.__attack_parked`;
  assert.ok(existsSync(path));
  cpSync(path, parked, { recursive: true });
  rmSync(path, { recursive: true, force: true });
  try {
    checkApplicationFeatureRegistryContract();
    assert.ok(hasViolationMatching(new RegExp(sample.name, 'i')), 'Missing feature must fail');
  } finally {
    cpSync(parked, path, { recursive: true });
    rmSync(parked, { recursive: true, force: true });
  }
}

// ── 7. Undeclared public feature door ───────────────────────────────────────
{
  clearViolations();
  const feature = APPLICATION_FEATURES.find((f) => !f.doors.includes('./ui'));
  assert.ok(feature, 'Need a feature without ui door');
  const uiPath = join(ROOT, feature!.sourcePath, 'ui.ts');
  const hadUi = existsSync(uiPath);
  if (!hadUi) writeFileSync(uiPath, 'export {};\n');
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_door.ts');
  writeFileSync(probe, `import {} from '@/features/${feature!.name}/ui';\n`);
  try {
    checkFeatureDoorContract();
    assert.ok(
      hasViolationMatching(/undeclared door|not permitted|Deep cross-feature/i) ||
        hasViolationMatching(new RegExp(`${feature!.name}/ui`)),
      'Undeclared door must fail',
    );
  } finally {
    rmSync(probe, { force: true });
    if (!hadUi && existsSync(uiPath)) rmSync(uiPath, { force: true });
  }
}

// ── 8. Manual modification of generated architecture documentation ──────────
{
  clearViolations();
  const docPath = join(ROOT, 'docs/01-architecture/08-reference/capability-map.md');
  const original = readFileSync(docPath, 'utf8');
  writeFileSync(docPath, `${original}\n<!-- attack drift -->\n`);
  try {
    checkArchitectureDocsDriftContract();
    assert.ok(hasViolationMatching(/Architecture Docs Drift|capability-map/i));
  } finally {
    writeFileSync(docPath, original);
  }
}

// ── 9. Architecture model / documentation count drift ───────────────────────
{
  clearViolations();
  const rendered = renderArchitectureDoc(
    'docs/01-architecture/08-reference/application-feature-catalog.md',
  );
  assert.ok(rendered.includes(`| Application features | ${APPLICATION_FEATURES.length} |`));
  assert.ok(rendered.includes(`| Sealed capability packages | ${CAPABILITY_PACKAGES.length} |`));
  const cap = renderArchitectureDoc('docs/01-architecture/08-reference/capability-map.md');
  assert.ok(cap.includes(`| Sealed packages | ${CAPABILITY_PACKAGES.length} |`));
  writeArchitectureDocs();
  assert.equal(diffArchitectureDocs().length, 0);
}

// ── 10. Existing package deep-import attack ─────────────────────────────────
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_pkg.ts');
  writeFileSync(probe, "import {} from '@asol/data-core/src/core/database/db-client';\n");
  try {
    checkPackageSealContract(probe, readFileSync(probe, 'utf8'));
    assert.ok(
      violations.some((v) => /data-core|seal|deep|door/i.test(`${v.layer} ${v.violation}`)),
      'Package deep-import must fail',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

// ── 11. Application door re-exporting browser poison ────────────────────────
{
  clearViolations();
  const feature = APPLICATION_FEATURES.find(
    (f) => f.hasServer || f.doors.includes('./server') || f.runtimeTargets.includes('server'),
  );
  assert.ok(feature, 'Need a server-capable feature');
  const poison = join(ROOT, feature!.sourcePath, '__attack_browser_poison.ts');
  const indexPath = join(ROOT, feature!.sourcePath, 'index.ts');
  assert.ok(existsSync(indexPath));
  const original = readFileSync(indexPath, 'utf8');
  writeFileSync(
    poison,
    "import {} from '@asol/data-core/browser';\nexport const attack = true;\n",
  );
  writeFileSync(
    indexPath,
    `${original}\nexport * from './__attack_browser_poison';\n`,
  );
  try {
    checkFeatureApplicationDoorPurityContract();
    assert.ok(
      hasViolationMatching(/browser poison|Feature Door Purity/i),
      'Browser poison on application door must fail',
    );
  } finally {
    writeFileSync(indexPath, original);
    rmSync(poison, { force: true });
  }
}

clearViolations();
console.log(
  `Adversarial architecture attacks: 11 scenarios rejected ` +
    `(${APPLICATION_FEATURES.length} features, ${CAPABILITY_PACKAGES.length} packages).`,
);
