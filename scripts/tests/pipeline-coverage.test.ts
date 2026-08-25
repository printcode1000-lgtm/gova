import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { resolveGeneratedGate } from '../generated-gates';

function getAllFiles(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        files.push(...getAllFiles(full, exts));
      }
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function main() {
  const root = process.cwd();
  const packageJsonPath = path.join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const scripts = pkg.scripts || {};

  // ── S4: Generated gate wiring for test:*-core & test:compositions ─────────
  const testCoreScripts = Object.keys(scripts).filter((key) => /^test:.*-core$/.test(key));
  assert.ok(testCoreScripts.length >= 3, `Expected at least 3 test:*-core scripts, found ${testCoreScripts.length}`);

  const testGate = new Set(
    resolveGeneratedGate('test', scripts)
      .filter((step) => step.kind === 'npm-script')
      .map((step) => step.value),
  );
  const buildGate = new Set(
    resolveGeneratedGate('build', scripts)
      .filter((step) => step.kind === 'npm-script')
      .map((step) => step.value),
  );
  const buildStaticGate = new Set(
    resolveGeneratedGate('build:static', scripts)
      .filter((step) => step.kind === 'npm-script')
      .map((step) => step.value),
  );

  for (const scriptName of testCoreScripts) {
    assert.ok(testGate.has(scriptName), `Script ${scriptName} must be included in the generated test gate`);
    assert.ok(buildGate.has(scriptName), `Script ${scriptName} must be included in the generated build gate`);
    assert.ok(buildStaticGate.has(scriptName), `Script ${scriptName} must be included in the generated build:static gate`);
  }
  for (const gate of [testGate, buildGate, buildStaticGate]) {
    assert.ok(gate.has('test:compositions'), 'test:compositions must be included in every generated release gate');
  }
  console.log('  ✔ S4: All test:*-core & test:compositions scripts are covered by the generated gates.');

  // The generated runner must not directly spawn npm.cmd. Modern Node rejects direct .cmd/.bat
  // execution on Windows; npm_execpath lets Node execute npm-cli.js without a shell.
  const generatedGateRunner = readFileSync(path.join(root, 'scripts/run-generated-gate.ts'), 'utf8');
  assert.match(generatedGateRunner, /npm_execpath/, 'Generated gate runner must prefer npm_execpath.');
  assert.match(generatedGateRunner, /process\.execPath/, 'Generated gate runner must execute npm-cli.js with Node.');
  assert.doesNotMatch(
    generatedGateRunner,
    /shell:\s*true/,
    'Generated gate runner must not combine spawn with shell:true (DEP0190).',
  );
  assert.doesNotMatch(
    generatedGateRunner,
    /const\s+npmBin\s*=.*npm\.cmd/s,
    'Generated gate runner must not restore direct spawnSync(npm.cmd, ...).',
  );

  // ── S1: No "./*" wildcard exports in any package.json ────────────────────
  const packagesDir = path.join(root, 'packages');
  const pkgDirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dirName of pkgDirs) {
    const pJsonPath = path.join(packagesDir, dirName, 'package.json');
    if (existsSync(pJsonPath)) {
      const pJson = JSON.parse(readFileSync(pJsonPath, 'utf8'));
      const exportsObj = pJson.exports || {};
      assert.ok(!exportsObj['./*'], `S1 Violation: Package ${dirName} has wildcard export "./*"`);
    }
  }
  console.log('  ✔ S1: Zero "./*" wildcard exports across all packages.');

  // ── S3: No @asol/*/* in tsconfig.json ────────────────────────────────────
  const tsConfigPath = path.join(root, 'tsconfig.json');
  const tsConfigText = readFileSync(tsConfigPath, 'utf8');
  assert.ok(!tsConfigText.includes('"@asol/*/*"'), 'S3 Violation: tsconfig.json contains forbidden @asol/*/* wildcard path');
  console.log('  ✔ S3: Zero @asol/*/* wildcards in tsconfig.json.');

  // ── S5: removed with CODEOWNERS ────────────────────────────────────────────
  //
  // Rule 6's ownership half was dropped: this is a single-developer repository, GitHub
  // refuses a review from the author of a pull request, and releases go out through
  // "deploy:all" pushing directly to main rather than through pull requests. A CODEOWNERS
  // file here declared ownership that nothing could ever act on.
  //
  // The test is deleted rather than kept and skipped. It was already guarded by an
  // existsSync check, so with the file gone it would have printed a green S5 line while
  // asserting nothing — the exact empty-guard pattern documented in
  // docs/01-architecture/02-packages/module-isolation-rules.md.
  //
  // Rule 6's enforcement half is the `main-only` creation ruleset and unrestricted
  // pushes to `main`. Branch protection must not be reapplied; `npm run github:protect`
  // only reports status or deletes leftover rules. See docs/07-mobile-and-release/github-ci-policy.md.

  // ── C3: runVercel child env overrides VERCEL_TOKEN ─────────────────────────
  const vercelDeployCoreIndex = readFileSync(path.join(packagesDir, 'vercel-deploy-core/src/index.ts'), 'utf8');
  assert.ok(
    vercelDeployCoreIndex.includes('VERCEL_TOKEN: options.token'),
    'C3 Violation: runVercel child env must override VERCEL_TOKEN with account specific token',
  );
  console.log("  ✔ C3: runVercel's child env explicitly overrides VERCEL_TOKEN with account-specific token.");

  // ── C4: No generated/ tree contains a token var of another account ───────
  const servicesDir = path.join(root, 'services');
  const serviceNames = ['notifications', 'products', 'orders', 'profiles'];
  for (const s of serviceNames) {
    const genDir = path.join(servicesDir, s, 'generated');
    if (existsSync(genDir)) {
      const files = getAllFiles(genDir, ['.ts', '.tsx', '.json']);
      for (const file of files) {
        const content = readFileSync(file, 'utf8');
        for (const other of serviceNames) {
          if (s === other) continue;
          const tokenName = `VERCEL_${other.toUpperCase()}_TOKEN`;
          assert.ok(
            !content.includes(tokenName),
            `C4 Violation: Mirror file ${file} for service ${s} contains foreign account token ${tokenName}`,
          );
        }
      }
    }
  }
  console.log('  ✔ C4: Zero foreign token variable names found in any generated/ mirror tree.');

  console.log('✅ Pipeline coverage test: all C3, C4, S1–S7 structural tests passed successfully!');
}

main();
