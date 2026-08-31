import { createPrivateKey, createPublicKey } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  createHash,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign,
  verify,
} from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

import {
  DIRECT_FILE_MODE,
  DIRECT_PUBLIC_FILE_MODE,
  directIdentityCertPath,
  directIdentityKeyPath,
  directIdentityPubPath,
  directIdentityTlsKeyPath,
  ensureDirectDir,
  directIdentityDir,
} from "./paths";

export interface HostIdentityKeyInfo {
  serverKeyId: string;
  publicKeyPem: string;
  privateKeyPem: string;
  createdAt: string;
}

export interface EphemeralKeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface TlsCredentials {
  key: string;
  cert: string;
  fingerprint: string;
}

export function computeKeyFingerprint(pem: string): string {
  return createHash("sha256").update(pem.trim()).digest("hex");
}

/**
 * Generate a persistent Ed25519 host identity key pair.
 */
export function generateHostIdentityKeyPair(): HostIdentityKeyInfo {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const serverKeyId = computeKeyFingerprint(publicKey);
  return {
    serverKeyId,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Load or initialize the machine-local persistent host identity key.
 * Private key is stored with 0600 mode and public key with 0644 mode under `.local/direct-agent/identity`.
 */
export function loadOrCreateHostIdentityKey(): HostIdentityKeyInfo {
  ensureDirectDir(directIdentityDir());
  const privPath = directIdentityKeyPath();
  const pubPath = directIdentityPubPath();

  if (existsSync(privPath) && existsSync(pubPath)) {
    const privateKeyPem = readFileSync(privPath, "utf8");
    const publicKeyPem = readFileSync(pubPath, "utf8");
    const serverKeyId = computeKeyFingerprint(publicKeyPem);
    return {
      serverKeyId,
      publicKeyPem,
      privateKeyPem,
      createdAt: new Date().toISOString(),
    };
  }

  const identity = generateHostIdentityKeyPair();
  writeFileSync(privPath, identity.privateKeyPem, { mode: DIRECT_FILE_MODE, encoding: "utf8" });
  chmodSync(privPath, DIRECT_FILE_MODE);

  writeFileSync(pubPath, identity.publicKeyPem, { mode: DIRECT_PUBLIC_FILE_MODE, encoding: "utf8" });
  chmodSync(pubPath, DIRECT_PUBLIC_FILE_MODE);

  return identity;
}

/**
 * Rotate the machine-local host identity key and generate new key material.
 */
export function rotateHostIdentityKey(): HostIdentityKeyInfo {
  ensureDirectDir(directIdentityDir());
  const privPath = directIdentityKeyPath();
  const pubPath = directIdentityPubPath();

  const identity = generateHostIdentityKeyPair();
  writeFileSync(privPath, identity.privateKeyPem, { mode: DIRECT_FILE_MODE, encoding: "utf8" });
  chmodSync(privPath, DIRECT_FILE_MODE);

  writeFileSync(pubPath, identity.publicKeyPem, { mode: DIRECT_PUBLIC_FILE_MODE, encoding: "utf8" });
  chmodSync(pubPath, DIRECT_PUBLIC_FILE_MODE);

  // Regenerate TLS credentials when rotating identity
  generateOrLoadTlsCredentials(true);

  return identity;
}

/**
 * Generate an ephemeral X25519 key pair for session key exchange.
 */
export function generateEphemeralKeyPair(): EphemeralKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("x25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

/**
 * Derive a shared symmetric key using X25519 ECDH + HKDF-SHA-256.
 */
export function deriveSharedSecret(
  privateKeyPem: string,
  peerPublicKeyPem: string,
  salt = Buffer.alloc(32, 0),
  info = "gova-direct-session-v1",
): Buffer {
  const sharedSecret = diffieHellman({
    privateKey: createPrivateKey(privateKeyPem),
    publicKey: createPublicKey(peerPublicKeyPem),
  });

  const derived = hkdfSync("sha256", sharedSecret, salt, info, 32);
  return Buffer.from(derived);
}

/**
 * Sign data with an Ed25519 private key. Returns base64url signature.
 */
export function signData(privateKeyPem: string, data: string | Buffer): string {
  const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  const signature = sign(null, buffer, privateKeyPem);
  return signature.toString("base64url");
}

/**
 * Verify data signature with an Ed25519 public key.
 */
export function verifyDataSignature(publicKeyPem: string, data: string | Buffer, signatureBase64Url: string): boolean {
  try {
    const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
    const signature = Buffer.from(signatureBase64Url, "base64url");
    return verify(null, buffer, publicKeyPem, signature);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographic challenge string.
 */
export function generateChallenge(): string {
  return `ch_${randomBytes(24).toString("hex")}`;
}

/**
 * Generate a unique session ID.
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${randomBytes(8).toString("hex")}`;
}

/**
 * Generate a cryptographic random nonce.
 */
export function generateNonce(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Generate or load self-signed TLS 1.3 credentials for the local direct server daemon.
 */
export function generateOrLoadTlsCredentials(forceNew = false): TlsCredentials {
  ensureDirectDir(directIdentityDir());
  const keyPath = directIdentityTlsKeyPath();
  const certPath = directIdentityCertPath();

  if (!forceNew && existsSync(keyPath) && existsSync(certPath)) {
    const key = readFileSync(keyPath, "utf8");
    const cert = readFileSync(certPath, "utf8");
    return {
      key,
      cert,
      fingerprint: computeKeyFingerprint(cert),
    };
  }

  // Generate self-signed RSA or EC certificate using OpenSSL CLI on local host
  execFileSync("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-days",
    "365",
    "-subj",
    "/CN=gova-direct-agent",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1",
  ]);

  chmodSync(keyPath, DIRECT_FILE_MODE);
  chmodSync(certPath, DIRECT_PUBLIC_FILE_MODE);

  const key = readFileSync(keyPath, "utf8");
  const cert = readFileSync(certPath, "utf8");
  return {
    key,
    cert,
    fingerprint: computeKeyFingerprint(cert),
  };
}
