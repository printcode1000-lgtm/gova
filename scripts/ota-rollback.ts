import { getOtaPrefix, loadOtaEnvironment } from './ota/ota-config';
import { createOtaR2Client, getOtaManifestObject, putOtaObject } from './ota/ota-r2';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  loadOtaEnvironment();
  const version = argument('version');
  if (!version) throw new Error('Usage: npm run ota:rollback -- --version 1.2.2');

  const prefix = getOtaPrefix();
  const client = createOtaR2Client();
  const manifest = await getOtaManifestObject(client, `${prefix}/releases/${version}/manifest.json`);
  await putOtaObject(
    client,
    `${prefix}/manifest.json`,
    JSON.stringify(manifest, null, 2),
    'application/json',
    'no-store, max-age=0',
  );
  console.log(`✅ OTA channel rolled back to ${version}`);
}

main().catch((error) => {
  console.error(`❌ OTA rollback failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
