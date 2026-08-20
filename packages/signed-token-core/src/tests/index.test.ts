import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { hmacDigest, signEnvelope, signaturesMatch, verifyEnvelope } from '../index';

const SECRET = 'signed-token-core-test-secret-0123456789';
const options = {
  secret: () => SECRET,
  invalidError: 'tokenInvalid',
  expiredError: 'tokenExpired',
};

// ── Door contract ───────────────────────────────────────────────────────────
const manifest = JSON.parse(
  readFileSync(path.join(process.cwd(), 'packages/signed-token-core/package.json'), 'utf8'),
) as { exports: Record<string, unknown> };
assert.deepEqual(Object.keys(manifest.exports), ['.'], 'One door: signing has one load-time contract.');

const source = readFileSync(
  path.join(process.cwd(), 'packages/signed-token-core/src/domain/signed-envelope.ts'),
  'utf8',
);
assert.ok(
  !/from\s+'(?!node:crypto)[^']*'/.test(source.replace(/from\s+'\.\.?\/[^']*'/g, '')),
  'This package depends on node:crypto alone. A configuration import here would tie every ' +
    'caller to one secret.',
);

interface Claims { uid: string; expiresAt: number }

// ── Round trip ──────────────────────────────────────────────────────────────
const token = signEnvelope<Claims>({ uid: 'u1' }, { ...options, ttlMs: 60_000 });
const claims = verifyEnvelope<Claims>(token, options);
assert.equal(claims.uid, 'u1');
assert.ok(claims.expiresAt > Date.now(), 'ttlMs stamps an expiry from now.');

// The wire format is `base64url(payload).base64url(hmac)`, and other deployments already parse
// it. Pinned so a "harmless" encoding change cannot invalidate every live token silently.
const [encoded, mac] = token.split('.');
assert.equal(token.split('.').length, 2);
assert.equal(mac, createHmac('sha256', SECRET).update(encoded!).digest('base64url'));
assert.equal(JSON.parse(Buffer.from(encoded!, 'base64url').toString('utf8')).uid, 'u1');

// ── Rejection ───────────────────────────────────────────────────────────────
for (const bad of ['', 'no-dot', 'a.b.c', null, undefined, 42, `${encoded}.`]) {
  assert.throws(
    () => verifyEnvelope<Claims>(bad as string, options),
    /tokenInvalid/,
    `A malformed token (${String(bad)}) must be invalid, never expired and never parsed.`,
  );
}

const forged = `${Buffer.from(JSON.stringify({ uid: 'attacker', expiresAt: Date.now() + 1000 })).toString('base64url')}.${mac}`;
assert.throws(() => verifyEnvelope<Claims>(forged, options), /tokenInvalid/, 'A rewritten payload fails.');

const wrongSecret = signEnvelope<Claims>({ uid: 'u1' }, { ...options, secret: () => 'other', ttlMs: 60_000 });
assert.throws(() => verifyEnvelope<Claims>(wrongSecret, options), /tokenInvalid/);

// Expiry is only reported for a token that was genuinely signed — otherwise "expired" would tell
// a forger the rest of their token was acceptable.
const expired = signEnvelope<Claims>({ uid: 'u1', expiresAt: Date.now() - 1 }, options);
assert.throws(() => verifyEnvelope<Claims>(expired, options), /tokenExpired/);

const noExpiry = `${Buffer.from(JSON.stringify({ uid: 'u1' })).toString('base64url')}`;
const signedNoExpiry = `${noExpiry}.${createHmac('sha256', SECRET).update(noExpiry).digest('base64url')}`;
assert.throws(
  () => verifyEnvelope<Claims>(signedNoExpiry, options),
  /tokenInvalid/,
  'A signed payload without an expiry is invalid — never treated as valid forever.',
);

assert.throws(
  () => signEnvelope<Claims>({ uid: 'u1' }, options),
  /signedEnvelopeExpiryRequired/,
  'Signing without a ttl and without an explicit expiry is refused rather than eternal.',
);

// ── Caller-supplied validation ──────────────────────────────────────────────
const shaped = signEnvelope<Claims>({ uid: '' }, { ...options, ttlMs: 60_000 });
assert.throws(
  () => verifyEnvelope<Claims>(shaped, { ...options, validate: (p) => Boolean(p.uid) }),
  /tokenInvalid/,
  'A payload that fails the caller’s shape check is invalid, not expired.',
);

// ── Primitives ──────────────────────────────────────────────────────────────
assert.ok(signaturesMatch('abc', 'abc'));
assert.equal(signaturesMatch('abc', 'abcd'), false, 'A length mismatch is false, never a throw.');
assert.equal(signaturesMatch('', 'abc'), false);
assert.equal(
  hmacDigest(SECRET, 'phone:0100'),
  createHmac('sha256', SECRET).update('phone:0100').digest('hex'),
  'Lookup digests stay hex — the recovery table already holds hex values.',
);
assert.equal(hmacDigest(SECRET, 'x', 'base64url').includes('='), false);

console.log('@asol/signed-token-core contract: 1 door, node:crypto only, envelope + rejection order pinned.');
