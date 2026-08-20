import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * `base64url(payload).base64url(HMAC-SHA256(payload))` — the one envelope this project signs.
 *
 * Four independent copies of this existed: the session token, the notification grant, the
 * specialty-chat capability, and the password-recovery digests. They agreed by accident rather
 * than by construction, and the parts that are easy to get subtly wrong — comparing signatures
 * in constant time, treating a length mismatch as a mismatch rather than letting `timingSafeEqual`
 * throw, refusing an expired payload before trusting its contents — were re-derived each time.
 *
 * Server-only by nature: it needs a signing secret, and a secret that reaches a browser is not a
 * secret. The secret is read through a callback rather than imported, so the package stays free
 * of every configuration module and each caller keeps its own key.
 */
export interface SignedEnvelopeOptions {
  /** Reads the signing secret at call time — never at module load, where no env exists yet. */
  secret: () => string;
  /** Thrown for a malformed token, a bad signature, or a payload that fails validation. */
  invalidError: string;
  /** Thrown when the payload is well-formed and signed but past its expiry. */
  expiredError: string;
}

export interface SignOptions {
  /** Milliseconds from now. Omit when the payload already carries its own `expiresAt`. */
  ttlMs?: number;
}

/** Every payload this envelope carries states when it stops being valid. */
export interface ExpiringPayload {
  expiresAt: number;
}

function signature(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

/** A raw HMAC-SHA256 digest. Used for lookup hashes, which are not tokens and carry no payload. */
export function hmacDigest(
  secret: string,
  value: string,
  encoding: 'hex' | 'base64url' = 'hex',
): string {
  return createHmac('sha256', secret).update(value).digest(encoding);
}

/** Constant-time comparison that treats a length difference as a mismatch, never as a throw. */
export function signaturesMatch(candidate: string, expected: string): boolean {
  if (typeof candidate !== 'string' || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

/**
 * Signs a payload. When `ttlMs` is given, `expiresAt` is stamped from now — a caller that already
 * decided its own expiry passes the payload with `expiresAt` set and omits `ttlMs`.
 */
export function signEnvelope<TPayload extends ExpiringPayload>(
  payload: Omit<TPayload, 'expiresAt'> & { expiresAt?: number },
  options: SignedEnvelopeOptions & SignOptions,
): string {
  const expiresAt =
    payload.expiresAt ?? (options.ttlMs === undefined ? undefined : Date.now() + options.ttlMs);
  if (typeof expiresAt !== 'number') {
    throw new Error('signedEnvelopeExpiryRequired');
  }
  const encoded = Buffer.from(JSON.stringify({ ...payload, expiresAt })).toString('base64url');
  return `${encoded}.${signature(options.secret(), encoded)}`;
}

/**
 * Verifies a token and returns its payload.
 *
 * Order matters and is part of the contract: signature first, then shape, then expiry. Parsing
 * before verifying would run `JSON.parse` on attacker-controlled bytes, and reporting "expired"
 * for an unsigned token would tell a caller its forgery was otherwise acceptable.
 */
export function verifyEnvelope<TPayload extends ExpiringPayload>(
  token: unknown,
  options: SignedEnvelopeOptions & { validate?: (payload: TPayload) => boolean },
): TPayload {
  const parts = typeof token === 'string' ? token.split('.') : [];
  const [encoded, candidate] = parts;
  if (!encoded || !candidate || parts.length !== 2) throw new Error(options.invalidError);

  if (!signaturesMatch(candidate, signature(options.secret(), encoded))) {
    throw new Error(options.invalidError);
  }

  let payload: TPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TPayload;
  } catch {
    throw new Error(options.invalidError);
  }
  if (!payload || typeof payload !== 'object') throw new Error(options.invalidError);
  if (options.validate && !options.validate(payload)) throw new Error(options.invalidError);
  if (!Number.isFinite(payload.expiresAt)) throw new Error(options.invalidError);
  if (payload.expiresAt <= Date.now()) throw new Error(options.expiredError);

  return payload;
}
