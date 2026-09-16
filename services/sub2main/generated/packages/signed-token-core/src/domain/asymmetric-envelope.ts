import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

/**
 * `base64url(payload).base64url(Ed25519(payload))` — the envelope for a token whose
 * verifier must not hold the signing key.
 *
 * The HMAC envelope is the right shape whenever both ends are this project: one
 * secret, two deployments that already share it. It is the wrong shape when the
 * verifier is a separate application on a user's device, because HMAC
 * verification requires the same key that signs — so shipping the ability to
 * check a token would also ship the ability to mint one.
 *
 * Ed25519 splits those. The server keeps the private key; the verifier embeds
 * only the public key and can prove a token is genuine without being able to
 * forge one. That is what lets the SMS gateway's send authorization be checked
 * on the device that sends it.
 */
export interface AsymmetricEnvelopeOptions {
  /** PKCS#8 PEM, read at call time — never at module load, where no env exists yet. */
  privateKeyPem: () => string;
  invalidError: string;
  expiredError: string;
}

export interface AsymmetricVerifyOptions<TPayload> {
  /** SPKI PEM. The only key a verifier needs, and it is not a secret. */
  publicKeyPem: () => string;
  invalidError: string;
  expiredError: string;
  validate?: (payload: TPayload) => boolean;
}

export interface AsymmetricExpiringPayload {
  expiresAt: number;
}

export function signAsymmetricEnvelope<TPayload extends AsymmetricExpiringPayload>(
  payload: TPayload,
  options: AsymmetricEnvelopeOptions,
): string {
  if (!Number.isFinite(payload.expiresAt)) throw new Error('signedEnvelopeExpiryRequired');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = createPrivateKey(options.privateKeyPem());
  return `${encoded}.${sign(null, Buffer.from(encoded), key).toString('base64url')}`;
}

/**
 * Verifies and returns the payload. Same order as the HMAC envelope, for the same
 * reasons: signature, then shape, then expiry — so `JSON.parse` never runs on
 * unverified bytes and a forgery is never reported as merely expired.
 */
export function verifyAsymmetricEnvelope<TPayload extends AsymmetricExpiringPayload>(
  token: unknown,
  options: AsymmetricVerifyOptions<TPayload>,
): TPayload {
  const parts = typeof token === 'string' ? token.split('.') : [];
  const [encoded, candidate] = parts;
  if (!encoded || !candidate || parts.length !== 2) throw new Error(options.invalidError);

  let signatureValid = false;
  try {
    signatureValid = verify(
      null,
      Buffer.from(encoded),
      createPublicKey(options.publicKeyPem()),
      Buffer.from(candidate, 'base64url'),
    );
  } catch {
    throw new Error(options.invalidError);
  }
  if (!signatureValid) throw new Error(options.invalidError);

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
