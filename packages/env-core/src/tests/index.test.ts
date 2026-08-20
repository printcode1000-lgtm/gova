import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
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

const ROOT = process.cwd();

// ── Doors ───────────────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'packages/env-core/package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
};
assert.deepEqual(
  Object.keys(manifest.exports),
  ['.', './files'],
  'Two doors on the node line: reading a variable is browser-safe, reading a .env file is not.',
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

console.log('@asol/env-core contract: 2 doors, blank-is-absent pinned, .env precedence pinned.');
