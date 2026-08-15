import assert from "node:assert/strict";
import {
  acceptOtaRevocationDocument,
  isPersistedOtaRevocationState,
} from "../domain/release/revocation-state";
import type { OtaRevocationDocument } from "../domain/release/revocation-document";

export async function runRevocationStateTests(): Promise<void> {
  const doc: OtaRevocationDocument = {
    schemaVersion: 1,
    issuedAt: "2026-08-15T00:00:00.000Z",
    revokedVersions: ["0.2.4.1"],
    signature: "sig",
  };

  const acceptance1 = acceptOtaRevocationDocument(null, doc);
  assert.equal(acceptance1.accepted, true);
  assert.deepEqual(acceptance1.state?.document, doc);

  const olderDoc: OtaRevocationDocument = {
    schemaVersion: 1,
    issuedAt: "2026-08-14T00:00:00.000Z",
    revokedVersions: [],
    signature: "sig",
  };

  const acceptance2 = acceptOtaRevocationDocument(acceptance1.state, olderDoc);
  assert.equal(acceptance2.accepted, false);

  assert.equal(isPersistedOtaRevocationState(acceptance1.state), true);
  assert.equal(isPersistedOtaRevocationState({}), false);

  console.log("  ✔ revocation-state unit tests passed");
}

if (process.argv[1]?.endsWith("revocation-state.test.ts")) {
  runRevocationStateTests().catch((e) => { console.error(e); process.exit(1); });
}
