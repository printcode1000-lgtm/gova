/** Single responsibility: publish only the emergency OTA revocation document. */
import {
  createOtaR2Client,
  putOtaObject,
} from "./ota-r2";
import {
  getOtaPrefix,
  getOtaPrivateKey,
  loadOtaEnvironment,
} from "./ota-config";
import {
  createSignedRevocationDocument,
  mergeRevokedVersions,
  readTrackedRevokedVersions,
  writeTrackedRevokedVersions,
} from "./ota-revocation";
import { readVerifiedLiveRevocationDocument } from "./ota-live-revocation";
import { isOtaVersion } from "../../src/features/ota/utils/ota-state";

async function main(): Promise<void> {
  loadOtaEnvironment();
  const args = process.argv.slice(2);
  const restore = args[0] === "--restore";
  const version = args[restore ? 1 : 0];
  if (!isOtaVersion(version)) {
    throw new Error("Usage: npm run ota:revoke -- <version> | npm run ota:revoke -- --restore <version>");
  }

  const privateKey = getOtaPrivateKey();
  const client = createOtaR2Client();
  const revocationKey = `${getOtaPrefix()}/revocations.json`;
  const tracked = readTrackedRevokedVersions();
  const live = await readVerifiedLiveRevocationDocument(
    client,
    revocationKey,
    privateKey,
  );
  const { merged, recovered } = mergeRevokedVersions(
    tracked,
    live?.revokedVersions ?? [],
  );
  if (recovered.length) {
    console.warn(`Recovered live revoked versions: ${recovered.join(", ")}`);
  }
  const versions = new Set(merged);
  if (restore) versions.delete(version);
  else versions.add(version);
  const revokedVersions = mergeRevokedVersions([...versions], []).merged;
  writeTrackedRevokedVersions(revokedVersions);

  const document = createSignedRevocationDocument(
    revokedVersions,
    new Date().toISOString(),
    privateKey,
  );
  await putOtaObject(
    client,
    revocationKey,
    JSON.stringify(document, null, 2),
    "application/json",
    "no-store, max-age=0",
  );
  console.log(`Revoked OTA versions: ${revokedVersions.join(", ") || "none"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
