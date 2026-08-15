#!/usr/bin/env tsx
import {
  createOtaR2Client,
  getOtaManifestObject,
  getOtaPrefix,
  loadOtaEnvironment,
  readLiveOtaRelease,
} from "../src/publishing";

async function main(): Promise<void> {
  loadOtaEnvironment();
  const manifestKey = `${getOtaPrefix()}/manifest.json`;
  const client = createOtaR2Client();
  const manifest = await getOtaManifestObject(client, manifestKey);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(`❌ OTA status failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
