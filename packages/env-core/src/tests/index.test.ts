import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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

// ── .env files ──────────────────────────────────────────────────────────────
const dir = mkdtempSync(path.join(os.tmpdir(), 'env-core-'));
const local = path.join(dir, '.env.local');
const base = path.join(dir, '.env');
writeFileSync(local, 'SHARED=from-local\nONLY_LOCAL=1\n');
writeFileSync(base, 'SHARED=from-base\nONLY_BASE=2\nlowercase=ignored\n');

const files = readEnvFiles([local, base]);
assert.equal(files.SHARED, 'from-local', '.env.local wins — that is the developer override.');
assert.equal(files.ONLY_LOCAL, '1');
assert.equal(files.ONLY_BASE, '2');
assert.equal(files.lowercase, undefined, 'Only upper-case keys are environment variables.');
assert.deepEqual(readEnvFiles([path.join(dir, 'nope')]), {}, 'A missing file is empty, not a throw.');

// Raw values: a token whose trailing characters matter must not be altered on the way to a
// database. This is why the file reader does not reuse the trimming rule above.
writeFileSync(base, 'TOKEN=abc \n');
assert.equal(readEnvFiles([base]).TOKEN, 'abc ');

assert.deepEqual(
  [...RELEASE_TOOL_ENV_FILES],
  ['.env.local', '.env', 'fastlane/.env'],
  'Release-tool files are ordered: local, then base, then Fastlane.',
);

const parsedEmpty = parseReleaseEnvFileText(
  'PRESENT=from-file\nEMPTY=\n# comment\nexport EXPORTED=1\nGOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64=secret-value\n',
);
assert.equal(parsedEmpty.PRESENT, 'from-file');
assert.equal(parsedEmpty.EMPTY, '');
assert.equal(parsedEmpty.EXPORTED, '1');
assert.equal(
  parsedEmpty.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64,
  'secret-value',
  'Parser keeps values; tests may read fixtures but production loading must never log them.',
);

const releaseDir = mkdtempSync(path.join(os.tmpdir(), 'env-core-release-'));
const fastlaneDir = path.join(releaseDir, 'fastlane');
mkdirSync(fastlaneDir, { recursive: true });
writeFileSync(
  path.join(releaseDir, '.env.local'),
  'SHARED=from-local\nEMPTY_LOCAL=\nONLY_LOCAL=1\nPROCESS_WINS=from-local\n',
);
writeFileSync(
  path.join(releaseDir, '.env'),
  'SHARED=from-base\nEMPTY_LOCAL=from-base\nONLY_BASE=play-from-env\nFASTLANE_ONLY=\nGOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64=base-secret\n',
);
writeFileSync(
  path.join(fastlaneDir, '.env'),
  'FASTLANE_ONLY=from-fastlane\nGOOGLE_PLAY_JSON_KEY_FILE=from-fastlane\nONLY_BASE=should-not-win\n',
);

const fakeEnv: NodeJS.ProcessEnv = { PROCESS_WINS: 'from-process' };
loadReleaseToolEnvironment({
  cwd: releaseDir,
  env: fakeEnv,
});
assert.equal(fakeEnv.PROCESS_WINS, 'from-process', 'Existing process values win.');
assert.equal(fakeEnv.SHARED, 'from-local', '.env.local fills missing keys.');
assert.equal(
  fakeEnv.EMPTY_LOCAL,
  'from-base',
  'Empty .env.local declarations do not mask a later non-empty .env value.',
);
assert.equal(
  fakeEnv.ONLY_BASE,
  'play-from-env',
  'An existing .env.local without Google keys does not suppress valid keys in .env.',
);
assert.equal(fakeEnv.ONLY_LOCAL, '1');
assert.equal(
  fakeEnv.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64,
  'base-secret',
  '.env supplies a still-missing Google Play key.',
);
assert.equal(fakeEnv.FASTLANE_ONLY, 'from-fastlane', 'fastlane/.env supplies a still-missing release key.');
assert.equal(fakeEnv.ONLY_BASE, 'play-from-env', 'Later files cannot overwrite a non-empty earlier value.');
assert.equal(fakeEnv.GOOGLE_PLAY_JSON_KEY_FILE, 'from-fastlane');

const logged: string[] = [];
const originalLog = console.log;
const originalError = console.error;
console.log = (...args: unknown[]) => {
  logged.push(args.map(String).join(' '));
};
console.error = (...args: unknown[]) => {
  logged.push(args.map(String).join(' '));
};
try {
  loadReleaseToolEnvironment({ cwd: releaseDir, env: {} });
} finally {
  console.log = originalLog;
  console.error = originalError;
}
assert.equal(logged.join('\n').includes('base-secret'), false, 'No secret value is logged.');
assert.equal(logged.join('\n').includes('from-fastlane'), false, 'No Fastlane secret value is logged.');

const sources = resolveReleaseToolEnvironmentSources({
  cwd: releaseDir,
  env: { PROCESS_WINS: 'from-process' },
});
const byKey = Object.fromEntries(sources.map((entry) => [entry.key, entry.source]));
assert.equal(byKey.PROCESS_WINS, 'process');
assert.equal(byKey.SHARED, '.env.local');
assert.equal(byKey.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64, '.env');
assert.equal(byKey.GOOGLE_PLAY_JSON_KEY_FILE, 'fastlane/.env');
assert.equal(
  sources.some((entry) => JSON.stringify(entry).includes('base-secret')),
  false,
  'Source reports never include secret values.',
);

console.log('@asol/env-core contract: 3 doors, blank-is-absent pinned, release-tool precedence pinned.');
