/**
 * Adversarial architecture attacks — prove the architecture model rejects bypasses.
 * Uses only the public `@asol/architecture-core` door.
 */
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATION_FEATURES,
  CAPABILITY_PACKAGES,
  checkApplicationFeatureRegistryContract,
  checkArchitectureDocsDriftContract,
  checkCapabilityOwnershipContract,
  checkFeatureApplicationDoorPurityContract,
  checkFeatureDependencyContract,
  checkFeatureDoorContract,
  checkPackageSealContract,
  checkRepositorySweepContract,
  diffArchitectureDocs,
  renderArchitectureDoc,
  violations,
  writeArchitectureDocs,
} from '@asol/architecture-core';

const ROOT = process.cwd();

/** Build attack source without putting the forbidden literal import in this scanned test file. */
function attackSource(parts: string[]): string {
  return parts.join('');
}

function clearViolations(): void {
  violations.length = 0;
}

function hasViolationMatching(re: RegExp): boolean {
  return violations.some((v) => re.test(`${v.layer} ${v.violation} ${v.file}`));
}

// 1. Unregistered feature directory.
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

// 2. Recreation of src/modules/.
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

// 3. Unknown top-level application directory.
{
  clearViolations();
  const unknown = join(ROOT, 'src/legacy-bucket');
  mkdirSync(unknown, { recursive: true });
  writeFileSync(join(unknown, 'x.ts'), 'export {};\n');
  try {
    checkApplicationFeatureRegistryContract();
    assert.ok(hasViolationMatching(/legacy-bucket/i), 'Unknown source root must fail');
  } finally {
    rmSync(unknown, { recursive: true, force: true });
  }
}

// 4. Deep cross-feature import bypassing a door.
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_probe.ts');
  writeFileSync(
    probe,
    attackSource([
      "import { something } from '",
      "@/features/auth",
      "/domain/session.entity';\nexport const x = something;\n",
    ]),
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

// 5. Feature dependency not allowed by registry.
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

// 6. Registry entry pointing at a missing feature.
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

// 7. Undeclared public feature door.
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

// 8. Manual modification of generated architecture documentation.
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

// 9. Architecture model / documentation count drift.
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

// 10. Existing package deep-import attack.
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_pkg.ts');
  writeFileSync(
    probe,
    attackSource(["import {} from '", "@asol/data-core", "/src/core/database/db-client';\n"]),
  );
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

// 11. Browser poison entering an actual composition/service-mirror feature graph.
{
  clearViolations();
  const composition = CAPABILITY_PACKAGES.find((p) => p.mayImportApp);
  const feature = APPLICATION_FEATURES[0];
  assert.ok(composition, 'Need a composition package');
  assert.ok(feature, 'Need an application feature');

  const poison = join(ROOT, feature!.sourcePath, '__attack_service_browser_poison.ts');
  const compositionProbe = join(
    ROOT,
    'packages',
    composition!.folder,
    'src',
    '__architecture_attack_service_browser.ts',
  );

  writeFileSync(
    poison,
    attackSource(["import {} from '", "@asol/data-core", "/browser';\nexport const attack = true;\n"]),
  );
  writeFileSync(
    compositionProbe,
    attackSource([
      "import { attack } from '",
      `@/features/${feature!.name}`,
      "/__attack_service_browser_poison';\nexport const serviceAttack = attack;\n",
    ]),
  );
  try {
    checkFeatureApplicationDoorPurityContract();
    assert.ok(
      hasViolationMatching(/browser capability|Feature Door Purity|service-mirror/i),
      'Browser poison reachable from a composition/service mirror must fail',
    );
  } finally {
    rmSync(compositionProbe, { force: true });
    rmSync(poison, { force: true });
  }
}

// 12. Unregistered twin feature folder.
{
  clearViolations();
  const twin = join(ROOT, 'src/features/auth-twin-attack');
  mkdirSync(twin, { recursive: true });
  writeFileSync(join(twin, 'index.ts'), 'export {};\n');
  try {
    checkApplicationFeatureRegistryContract();
    assert.ok(hasViolationMatching(/auth-twin-attack|not registered/i));
  } finally {
    rmSync(twin, { recursive: true, force: true });
  }
}

// 13. Multi-line deep cross-feature import.
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_multiline.ts');
  writeFileSync(
    probe,
    attackSource([
      "import {\n  something\n} from '",
      "@/features/auth",
      "/domain/session.entity';\nexport const x = something;\n",
    ]),
  );
  try {
    checkFeatureDoorContract();
    assert.ok(
      hasViolationMatching(/Deep cross-feature import|session\.entity/i),
      'Multi-line deep import must fail',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

// 14. Relative cross-feature traversal.
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_rel.ts');
  writeFileSync(
    probe,
    attackSource([
      "import { something } from '",
      "../auth",
      "/domain/session.entity';\nexport const x = something;\n",
    ]),
  );
  try {
    checkFeatureDoorContract();
    assert.ok(
      hasViolationMatching(/resolves into feature|Deep cross-feature|auth/i),
      'Relative cross-feature traversal must fail',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

// 15. Dynamic deep import.
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_dyn.ts');
  writeFileSync(
    probe,
    attackSource([
      "export async function load() {\n  return import('",
      "@/features/auth",
      "/domain/session.entity');\n}\n",
    ]),
  );
  try {
    checkFeatureDoorContract();
    assert.ok(
      hasViolationMatching(/Deep cross-feature import|session\.entity/i),
      'Dynamic deep import must fail',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

// 16. import type deep path.
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_type.ts');
  writeFileSync(
    probe,
    attackSource([
      "import type { Session } from '",
      "@/features/auth",
      "/domain/session.entity';\nexport type T = Session;\n",
    ]),
  );
  try {
    checkFeatureDoorContract();
    assert.ok(
      hasViolationMatching(/Deep cross-feature import|session\.entity/i),
      'import type deep path must fail',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

// 17. Barrel re-export of deep path.
{
  clearViolations();
  const barrel = join(ROOT, 'src/features/cart/__architecture_attack_barrel.ts');
  writeFileSync(
    barrel,
    attackSource([
      "export { something } from '",
      "@/features/auth",
      "/domain/session.entity';\n",
    ]),
  );
  try {
    checkFeatureDoorContract();
    assert.ok(
      hasViolationMatching(/Deep cross-feature import|session\.entity/i),
      'Barrel re-export of deep path must fail',
    );
  } finally {
    rmSync(barrel, { force: true });
  }
}

// 18. Unauthorized top-level source directory.
{
  clearViolations();
  const attackDir = join(ROOT, 'evil-root-dir');
  mkdirSync(attackDir, { recursive: true });
  writeFileSync(join(attackDir, 'index.ts'), 'export const x = 1;\n');
  try {
    checkRepositorySweepContract();
    assert.ok(
      hasViolationMatching(/evil-root-dir|Unauthorized top-level/i),
      'Unauthorized root source dir must fail',
    );
  } finally {
    rmSync(attackDir, { recursive: true, force: true });
  }
}

// 19. Unregistered package folder.
{
  clearViolations();
  const pkg = join(ROOT, 'packages/evil-core');
  mkdirSync(join(pkg, 'src'), { recursive: true });
  writeFileSync(
    join(pkg, 'package.json'),
    JSON.stringify({
      name: '@asol/evil-core',
      version: '0.0.0',
      private: true,
      type: 'module',
      exports: { '.': './src/index.ts' },
    }),
  );
  writeFileSync(join(pkg, 'src/index.ts'), 'export const evil = 1;\n');
  try {
    checkCapabilityOwnershipContract();
    assert.ok(
      hasViolationMatching(/evil-core|not registered/i),
      'Unregistered package must fail',
    );
  } finally {
    rmSync(pkg, { recursive: true, force: true });
  }
}

// 20. Undeclared feature dependency (door + dependency contracts).
{
  clearViolations();
  const probe = join(ROOT, 'src/features/qr-code/__architecture_attack_stale.ts');
  const target = APPLICATION_FEATURES.find((f) => f.name !== 'qr-code')!;
  writeFileSync(probe, `import {} from '@/features/${target.name}';\n`);
  try {
    checkFeatureDoorContract();
    const doorFailed = hasViolationMatching(/not permitted|permittedDependencies/i);
    clearViolations();
    checkFeatureDependencyContract();
    const depFailed = hasViolationMatching(/neither permittedDependencies|imports/i);
    assert.ok(doorFailed || depFailed, 'Undeclared dependency must fail');
  } finally {
    rmSync(probe, { force: true });
  }
}

// 21. require() deep package path.
{
  clearViolations();
  const probe = join(ROOT, 'src/features/cart/__architecture_attack_require.ts');
  writeFileSync(
    probe,
    attackSource([
      "const x = require('",
      "@asol/data-core",
      "/src/core/database/db-client');\nexport default x;\n",
    ]),
  );
  try {
    checkPackageSealContract(probe, readFileSync(probe, 'utf8'));
    assert.ok(
      violations.some((v) => /data-core|seal|deep|door/i.test(`${v.layer} ${v.violation}`)),
      'require() deep package path must fail',
    );
  } finally {
    rmSync(probe, { force: true });
  }
}

clearViolations();
console.log(
  `Adversarial architecture attacks: 21 scenarios rejected ` +
    `(${APPLICATION_FEATURES.length} features, ${CAPABILITY_PACKAGES.length} packages).`,
);
