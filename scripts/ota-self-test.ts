import { createHash, createPublicKey, sign, webcrypto } from 'node:crypto';
import { zipSync, unzipSync } from 'fflate';
import {
  OTA_SCHEMA_VERSION,
  canonicalManifestPayload,
  getOtaPrivateKey,
  getOtaPrefix,
  getOtaPublicKeyBase64,
  loadOtaEnvironment,
  type OtaManifestPayload,
} from './ota/ota-config';
import { createOtaR2Client, deleteOtaObject, putOtaObject } from './ota/ota-r2';

async function main(): Promise<void> {
  loadOtaEnvironment();
  const privateKey = getOtaPrivateKey();
  const payload: OtaManifestPayload = {
    schemaVersion: OTA_SCHEMA_VERSION,
    releaseId: 'self-test',
    version: '1.0.1',
    createdAt: new Date(0).toISOString(),
    bundleUrl: 'https://example.com/app-updates/releases/1.0.1/web-bundle.zip',
    size: 1,
    sha256: '0'.repeat(64),
    minimumNativeVersion: '1.0.0',
    mandatory: false,
    notes: 'self-test',
  };
  const data = Buffer.from(canonicalManifestPayload(payload));
  const signature = sign('sha256', data, { key: privateKey, dsaEncoding: 'ieee-p1363' });
  const publicKeyDer = createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
  const publicKey = await webcrypto.subtle.importKey(
    'spki',
    publicKeyDer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  const signatureValid = await webcrypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    data,
  );
  if (!signatureValid) throw new Error('P-256 manifest signature verification failed');

  const archive = zipSync({ 'index.html': Buffer.from('<!doctype html>') }, { level: 9 });
  const checksum = createHash('sha256').update(archive).digest('hex');
  const extracted = unzipSync(archive);
  if (!extracted['index.html'] || checksum.length !== 64) {
    throw new Error('ZIP or SHA-256 self-test failed');
  }
  if (getOtaPublicKeyBase64(privateKey) !== Buffer.from(publicKeyDer).toString('base64')) {
    throw new Error('Public key export mismatch');
  }

  if (process.argv.includes('--r2')) {
    const client = createOtaR2Client();
    const key = `${getOtaPrefix()}/_self-test/${Date.now()}.txt`;
    await putOtaObject(client, key, 'ok', 'text/plain', 'no-store');
    await deleteOtaObject(client, key);
    console.log('✅ OTA R2 write/delete probe passed');
  }

  console.log('✅ OTA signature, SHA-256, ZIP, and public-key self-test passed');
}

main().catch((error) => {
  console.error(`❌ OTA self-test failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
