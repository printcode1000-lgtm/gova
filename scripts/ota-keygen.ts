import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getOtaPublicKeyBase64 } from './ota/ota-config';

const directory = path.resolve('.ota');
const privateKeyPath = path.join(directory, 'private-key.pem');
const publicKeyPath = path.join(directory, 'public-key.txt');

if (existsSync(privateKeyPath)) {
  throw new Error(`Refusing to replace existing key: ${privateKeyPath}`);
}

const { privateKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

mkdirSync(directory, { recursive: true });
writeFileSync(privateKeyPath, privateKey, { encoding: 'utf8', mode: 0o600 });
writeFileSync(publicKeyPath, getOtaPublicKeyBase64(privateKey), 'utf8');

console.log(`✅ OTA private key: ${privateKeyPath}`);
console.log(`✅ OTA public key:  ${publicKeyPath}`);
console.log('Keep the private key secret and backed up. It is ignored by Git.');
