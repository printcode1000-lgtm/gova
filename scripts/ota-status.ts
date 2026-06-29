import { getOtaPrefix, loadOtaEnvironment } from './ota/ota-config';
import { createOtaR2Client, getOtaManifestObject } from './ota/ota-r2';

async function main(): Promise<void> {
  loadOtaEnvironment();
  const manifest = await getOtaManifestObject(createOtaR2Client(), `${getOtaPrefix()}/manifest.json`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(`❌ OTA status failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
