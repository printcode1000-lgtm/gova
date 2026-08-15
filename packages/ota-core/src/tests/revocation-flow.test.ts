import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  createSignedRevocationDocument,
  verifySignedRevocationDocument,
  mergeRevokedVersions,
  normalizeRevokedVersions,
} from "../publishing";

export async function runRevocationFlowTests(): Promise<void> {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  const versions = normalizeRevokedVersions(["0.2.4.1", "0.2.4.2"]);
  assert.deepEqual(versions, ["0.2.4.1", "0.2.4.2"]);

  const { merged, recovered } = mergeRevokedVersions(["0.2.4.1"], ["0.2.4.2"]);
  assert.deepEqual(merged, ["0.2.4.1", "0.2.4.2"]);
  assert.deepEqual(recovered, ["0.2.4.2"]);

  const doc = createSignedRevocationDocument(versions, new Date().toISOString(), privateKey);
  assert.ok(doc.signature);

  const verified = verifySignedRevocationDocument(doc, privateKey);
  assert.ok(verified !== null);
  assert.deepEqual(verified?.revokedVersions, versions);

  console.log("  ✔ revocation-flow integration tests passed");
}

if (process.argv[1]?.endsWith("revocation-flow.test.ts")) {
  runRevocationFlowTests().catch((e) => { console.error(e); process.exit(1); });
}
