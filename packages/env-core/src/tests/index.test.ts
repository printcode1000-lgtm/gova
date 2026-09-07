import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import {
  firstEnv,
  hasEnv,
  readBooleanEnv,
  readEnv,
  readListEnv,
  readOptionalEnv,
  requireEnv,
} from '../index';
import { readEnvFiles } from '../domain/env-files';
import {
  loadReleaseToolEnvironment,
  parseReleaseEnvFileText,
  RELEASE_TOOL_ENV_FILES,
  resolveReleaseToolEnvironmentSources,
} from '../domain/load-release-environment';

const ROOT = process.cwd();

// ── Doors ───────────────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'packages/env-core/package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
};
assert.deepEqual(
  Object.keys(manifest.exports),
  ['.', './files', './process'],
  'Three doors: browser-safe readers, .env file parsing, and Node process loading.',
);

const readEnvSource = readFileSync(path.join(ROOT, 'packages/env-core/src/domain/read-env.ts'), 'utf8');
assert.ok(
  !/from\s+'node:/.test(readEnvSource),
  'The main door must stay free of node builtins: it is read from client config too.',
);

const rootScripts = (
  JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  }
).scripts ?? {};
assert.equal(rootScripts['env:verify:single-source'], 'npx tsx scripts/verify-single-env-source.ts');
for (const lifecycle of ['predev', 'predev:checked', 'prebuild', 'prebuild:static', 'prebuild:vercel', 'prestart']) {
  assert.equal(
    rootScripts[lifecycle],
    'npm run env:verify:single-source',
    `${lifecycle} must refuse legacy local env files before runtime tooling starts.`,
  );
}

// ── Blank is absent ─────────────────────────────────────────────────────────
//
// The single rule these helpers exist to hold. A key set to "" or "   " is unconfigured, not
// configured-to-empty — which is what a partially provisioned deployment actually looks like.
const env = { SET: ' value ', BLANK: '   ', EMPTY: '', LIST: ' a, b ,,c ', TRUE: 'TRUE', ONE: '1', ZERO: '0' };

assert.equal(readOptionalEnv('SET', env), 'value', 'Values are trimmed.');
assert.equal(readOptionalEnv('BLANK', env), undefined);
assert.equal(readOptionalEnv('EMPTY', env), undefined);
assert.equal(readOptionalEnv('MISSING', env), undefined);

assert.equal(readEnv('SET', 'fallback', env), 'value');
assert.equal(readEnv('BLANK', 'fallback', env), 'fallback');
assert.equal(readEnv('MISSING', '', env), '');

assert.equal(requireEnv('SET', env), 'value');
for (const key of ['BLANK', 'EMPTY', 'MISSING']) {
  assert.throws(
    () => requireEnv(key, env),
    new RegExp(`${key} environment variable is not set`),
    'A required key names itself in the error — that message is read from a failed deploy log.',
  );
}

assert.equal(hasEnv('SET', env), true);
assert.equal(hasEnv('BLANK', env), false, 'Presence means usable, not merely defined.');

assert.equal(firstEnv(['MISSING', 'BLANK', 'SET'], env), 'value', 'The first usable spelling wins.');
assert.equal(firstEnv(['MISSING'], env), undefined);

assert.equal(readBooleanEnv('TRUE', env), true);
assert.equal(readBooleanEnv('ONE', env), true);
assert.equal(readBooleanEnv('ZERO', env), false, 'A "0" must never enable a branch.');
assert.equal(readBooleanEnv('SET', env), false, 'Only 1/true are true — not any non-empty string.');
assert.equal(readBooleanEnv('MISSING', env), false);

assert.deepEqual(readListEnv('LIST', env), ['a', 'b', 'c'], 'Lists trim and drop blanks.');
assert.deepEqual(readListEnv('MISSING', env), []);

// ── canonical local environment file ────────────────────────────────────────
const dir = mkdtempSync(path.join(os.tmpdir(), 'env-core-'));
const local = path.join(dir, '.env.local');
writeFileSync(local, 'SHARED=from-local\nONLY_LOCAL=1\nTOKEN=abc \n');

const files = readEnvFiles([local]);
assert.equal(files.SHARED, 'from-local');
assert.equal(files.ONLY_LOCAL, '1');
assert.equal(files.TOKEN, 'abc ', 'Raw file values remain untrimmed.');
assert.deepEqual(readEnvFiles([path.join(dir, 'nope')]), {}, 'A missing file is empty, not a throw.');

assert.deepEqual(
  [...RELEASE_TOOL_ENV_FILES],
  ['.env.local'],
  'Release tooling has exactly one local file source.',
);

const parsedEmpty = parseReleaseEnvFileText(
  'PRESENT=from-file\nEMPTY=\n# comment\nexport EXPORTED=1\nGOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64=secret-value\n',
);
assert.equal(parsedEmpty.PRESENT, 'from-file');
assert.equal(parsedEmpty.EMPTY, '');
assert.equal(parsedEmpty.EXPORTED, '1');
assert.equal(parsedEmpty.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64, 'secret-value');

const releaseDir = mkdtempSync(path.join(os.tmpdir(), 'env-core-release-'));
writeFileSync(
  path.join(releaseDir, '.env.local'),
  'SHARED=from-local\nONLY_LOCAL=1\nPROCESS_WINS=from-local\nGOOGLE_PLAY_JSON_KEY_FILE=from-local\n',
);
const fakeEnv: NodeJS.ProcessEnv = { PROCESS_WINS: 'from-process' };
loadReleaseToolEnvironment({ cwd: releaseDir, env: fakeEnv });
assert.equal(fakeEnv.PROCESS_WINS, 'from-process', 'Existing process values win.');
assert.equal(fakeEnv.SHARED, 'from-local');
assert.equal(fakeEnv.ONLY_LOCAL, '1');
assert.equal(fakeEnv.GOOGLE_PLAY_JSON_KEY_FILE, 'from-local');

const sources = resolveReleaseToolEnvironmentSources({
  cwd: releaseDir,
  env: { PROCESS_WINS: 'from-process' },
});
const byKey = Object.fromEntries(sources.map((entry) => [entry.key, entry.source]));
assert.equal(byKey.PROCESS_WINS, 'process');
assert.equal(byKey.SHARED, '.env.local');
assert.equal(byKey.GOOGLE_PLAY_JSON_KEY_FILE, '.env.local');
assert.equal(sources.some((entry) => JSON.stringify(entry).includes('from-local')), false);

writeFileSync(path.join(releaseDir, '.env'), 'LEGACY=forbidden\n');
assert.throws(
  () => loadReleaseToolEnvironment({ cwd: releaseDir, env: {} }),
  /legacyEnvironmentFileDetected:\.env/,
  'A legacy root .env must fail closed instead of becoming a hidden fallback.',
);
rmSync(path.join(releaseDir, '.env'));
writeFileSync(path.join(releaseDir, '.env.production'), 'LEGACY=forbidden\n');
assert.throws(
  () => loadReleaseToolEnvironment({ cwd: releaseDir, env: {} }),
  /legacyEnvironmentFileDetected:\.env\.production/,
  'Next.js environment variants must not become a second local source.',
);
rmSync(path.join(releaseDir, '.env.production'));
const releaseFastlaneDir = path.join(releaseDir, 'fastlane');
mkdirSync(releaseFastlaneDir, { recursive: true });
writeFileSync(path.join(releaseFastlaneDir, '.env'), 'LEGACY=forbidden\n');
assert.throws(
  () => loadReleaseToolEnvironment({ cwd: releaseDir, env: {} }),
  /legacyEnvironmentFileDetected:fastlane\/\.env/,
  'Fastlane must inherit the canonical process environment instead of loading its own env file.',
);
rmSync(path.join(releaseFastlaneDir, '.env'));

console.log('@asol/env-core contract: 3 doors, one local file source, blank-is-absent pinned.');
