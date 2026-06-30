import { createHash, createPublicKey, sign, webcrypto } from 'node:crypto';
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
  const indexHtml = '<!doctype html>';
  const payload: OtaManifestPayload = {
    schemaVersion: OTA_SCHEMA_VERSION,
    delivery: 'files',
    releaseId: 'self-test',
    version: '1.0.1',
    createdAt: new Date(0).toISOString(),
    baseUrl: 'https://example.com/app-updates/files',
    size: Buffer.byteLength(indexHtml),
    fileCount: 1,
    minimumNativeVersion: '1.0.0',
    mandatory: false,
    notes: 'self-test',
    files: {
      'index.html': {
        sha256: createHash('sha256').update(indexHtml).digest('hex'),
        size: Buffer.byteLength(indexHtml),
      },
    },
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

  const checksum = createHash('sha256').update(indexHtml).digest('hex');
  if (checksum.length !== 64 || checksum !== payload.files['index.html']!.sha256) {
    throw new Error('File SHA-256 self-test failed');
  }
  if (getOtaPublicKeyBase64(privateKey) !== Buffer.from(publicKeyDer).toString('base64')) {
    throw new Error('Public key export mismatch');
  }

  if (process.argv.includes('--r2')) {
    const client = createOtaR2Client();
    const key = `${getOtaPrefix()}/_self-test/${Date.now()}.txt`;
    await putOtaObject(client, key, 'ok', 'text/plain', 'no-store');
    await deleteOtaObject(client, key);
    console.log('OTA R2 write/delete probe passed');
  }

  console.log('OTA signature, file SHA-256, and public-key self-test passed');
}

main().catch((error) => {
  console.error(`OTA self-test failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
