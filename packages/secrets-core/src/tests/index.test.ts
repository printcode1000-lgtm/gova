import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  MANIFEST_FILE_NAME,
  PORTABLE_ARCHIVE_PATH,
  PORTABLE_RECOVERY_KEY_PATH,
  assertEncryptedArchive,
  isGitIgnored,
  manifestsContainSameFiles,
  resolveInsideWorkspace,
  shouldSkipSecretDiscoveryDirectory,
} from '../index';

const ROOT = process.cwd();

const source = readFileSync(
  path.join(ROOT, 'packages/secrets-core/src/archive/archive-workspace.ts'),
  'utf8',
);

// ── Door ────────────────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'packages/secrets-core/package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
};
assert.deepEqual(Object.keys(manifest.exports), ['.'], 'One door.');

// ── Path containment ────────────────────────────────────────────────────────
//
// The archive walks git-ignored paths and writes them back on restore. A path that escapes the
// workspace would let a crafted manifest overwrite files outside the repository, so this is the
// single most important rule in the package.
assert.equal(
  resolveInsideWorkspace('config/secret-archive-public.pem'),
  path.join(ROOT, 'config/secret-archive-public.pem'),
);
for (const escape of ['../outside.txt', '../../etc/passwd', path.join('nested', '..', '..', 'x')]) {
  assert.throws(
    () => resolveInsideWorkspace(escape),
    /Unsafe archive path/,
    `${escape} escapes the workspace and must be refused.`,
  );
}

// ── The archive's own files are never archived ──────────────────────────────
// (the `source` read below is also used by the encryption assertion further down)
//
// Backing up the encrypted archive into itself grows without bound, and backing up the recovery
// key into the archive it unlocks makes the key unrecoverable exactly when it is needed.
for (const excluded of [
  'config/secret-archive-public.pem',
  'config/secret-archive-latest.zip.enc',
  'config/secret-archive-latest.zip.enc.private-key.pem',
]) {
  assert.ok(source.includes(excluded), `${excluded} must stay excluded from the archive.`);
}

// ── Encrypted, always ───────────────────────────────────────────────────────
//
// The check runs 7-Zip and refuses anything whose listing does not report `Encrypted = +`.
// Asserted through the source rather than by producing an archive: the binary is not on every
// machine, and a test that silently skips when it is missing is worse than no test at all.
assert.ok(
  /Encrypted = \+/.test(source) && /not encrypted; it has been rejected/.test(source),
  'The archive must be rejected unless 7-Zip reports it as encrypted.',
);
assert.equal(
  assertEncryptedArchive.length,
  2,
  'It takes the 7-Zip executable and the archive path — both, so the caller cannot check a ' +
    'different archive from the one it wrote.',
);

// ── Manifest comparison ─────────────────────────────────────────────────────
const a = { files: [{ path: 'a', sha256: '1', size: 1 }], createdAt: '', version: 1 } as never;
const b = { files: [{ path: 'a', sha256: '1', size: 1 }], createdAt: 'later', version: 1 } as never;
const c = { files: [{ path: 'a', sha256: '2', size: 1 }], createdAt: '', version: 1 } as never;
assert.equal(manifestsContainSameFiles(a, b), true, 'A newer timestamp alone is not a change.');
assert.equal(manifestsContainSameFiles(a, c), false, 'A changed digest is a change.');

// ── Constants the CLIs and the deploy pipeline both rely on ─────────────────
assert.equal(MANIFEST_FILE_NAME, 'asol-secrets-manifest.json');
assert.ok(PORTABLE_ARCHIVE_PATH.endsWith('.zip.enc'));
assert.equal(PORTABLE_RECOVERY_KEY_PATH, `${PORTABLE_ARCHIVE_PATH}.private-key.pem`);
assert.equal(typeof isGitIgnored, 'function');

// ── Non-interactive restore password ───────────────────────────────────────
const passwordSource = readFileSync(
  path.join(ROOT, 'packages/secrets-core/src/archive/archive-password.ts'),
  'utf8',
);
assert.ok(
  passwordSource.includes('ASOL_SECRET_ARCHIVE_PASSWORD'),
  'Cloud Agents restore through ASOL_SECRET_ARCHIVE_PASSWORD.',
);
assert.ok(
  /SECRET_ARCHIVE_PASSWORD_ENV_VAR/.test(passwordSource),
  'The env var name is exported as a constant.',
);

// ── The CLIs stay CLIs ──────────────────────────────────────────────────────
for (const cli of [
  'scripts/backup-project-secrets.ts',
  'scripts/restore-project-secrets.ts',
  'scripts/verify-project-secrets.ts',
  'scripts/initialize-secret-archive-key.ts',
]) {
  const text = readFileSync(path.join(ROOT, cli), 'utf8');
  assert.ok(
    text.includes('@asol/secrets-core'),
    `${cli} must use the package rather than a second copy of the archive rules.`,
  );
  if (cli.endsWith('restore-project-secrets.ts')) {
    assert.ok(
      text.includes('resolveArchivePassword'),
      `${cli} must resolve the password through the package (env or TTY), not promptHidden alone.`,
    );
  }
  assert.ok(
    !/createCipheriv|createDecipheriv|publicEncrypt/.test(text),
    `${cli} performs its own cryptography. The envelope is held once, in the package.`,
  );
}

assert.equal(
  shouldSkipSecretDiscoveryDirectory('worktrees', '.claude/worktrees', false),
  true,
  'Agent worktrees are never archived.',
);
assert.equal(
  shouldSkipSecretDiscoveryDirectory('nested-clone', '.claude/worktrees/nested-clone', true),
  true,
  'A nested repository clone under an agent worktree is never archived.',
);
assert.equal(
  shouldSkipSecretDiscoveryDirectory(
    '.secret-archive',
    '.claude/worktrees/nested-clone/.secret-archive',
    false,
  ),
  true,
  'Adversarial nested .claude/worktrees paths stay excluded even without a nested .git.',
);
assert.equal(
  shouldSkipSecretDiscoveryDirectory(
    'AuthKey_dir',
    '.claude/worktrees/nested-clone/fastlane',
    false,
  ),
  true,
  'App Store material under an agent worktree is never archived from that clone.',
);
assert.equal(
  shouldSkipSecretDiscoveryDirectory('gova-copy', 'tmp/gova-copy', true),
  true,
  'A duplicated repository clone with its own .git is never archived.',
);
assert.equal(
  shouldSkipSecretDiscoveryDirectory('fastlane', 'fastlane', false),
  false,
  'The real Fastlane directory remains eligible.',
);
assert.equal(
  shouldSkipSecretDiscoveryDirectory('android', 'android', false),
  false,
  'The real Android tree remains eligible for signing material.',
);

const packageScripts = (
  JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  }
).scripts ?? {};
assert.equal(
  packageScripts['secrets:verify'],
  'npx tsx scripts/verify-project-secrets.ts',
  'secrets:verify is the read-only presence reporter.',
);

const backupPaths = JSON.parse(
  readFileSync(path.join(ROOT, 'config/secret-backup-paths.json'), 'utf8'),
) as { extensions?: string[]; namePatterns?: string[] };
assert.equal(backupPaths.extensions?.includes('.p8'), true, 'App Store .p8 files are backup-eligible.');
assert.equal(
  backupPaths.namePatterns?.includes('^AuthKey_.*\\.p8$'),
  true,
  'AuthKey_*.p8 App Store filenames are backup-eligible without committing a key.',
);

const verifyCli = readFileSync(path.join(ROOT, 'scripts/verify-project-secrets.ts'), 'utf8');
assert.doesNotMatch(
  verifyCli,
  /console\.(log|error)\([^)]*process\.env/,
  'secrets:verify must never print environment values.',
);
const presenceSource = readFileSync(
  path.join(ROOT, 'scripts/secret-presence-status.ts'),
  'utf8',
);
assert.match(presenceSource, /"present"/);
assert.match(presenceSource, /"empty"/);
assert.match(presenceSource, /"missing"/);
assert.match(presenceSource, /"file-present"/);
assert.match(presenceSource, /"file-missing"/);

const ensureRestore = readFileSync(
  path.join(ROOT, 'scripts/ensure-release-secrets-restored.ts'),
  'utf8',
);
assert.match(ensureRestore, /SECRET_ARCHIVE_PASSWORD_ENV_VAR/);
assert.match(ensureRestore, /PORTABLE_ARCHIVE_PATH/);
assert.doesNotMatch(ensureRestore, /promptHidden|readline|isTTY/);

console.log('@asol/secrets-core contract: 1 door, workspace containment and archive exclusions pinned.');
