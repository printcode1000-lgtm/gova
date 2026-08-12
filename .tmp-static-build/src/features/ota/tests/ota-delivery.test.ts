/** Single responsibility: verify capability gating, delta planning, resume, and bounded work. */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  resolveManifestCapabilities,
  resolveOptionalCapabilities,
  scanBuiltCapabilities,
  splitCapabilityRequirements,
} from "../../../../scripts/ota/ota-capability-scan";
import { evaluateOtaCapabilities } from "../utils/ota-capability-gate";
import { canonicalOtaManifestPayload } from "../utils/ota-signature-payload";
import { canonicalManifestPayload } from "../../../../scripts/ota/ota-config";
import {
  pendingDeltaFiles,
  planOtaDelta,
  runBounded,
} from "../utils/ota-delta-plan";
import type { OtaManifest } from "../types/ota.types";

function manifest(version: string, files: OtaManifest["files"]): OtaManifest {
  return {
    schemaVersion: 2,
    delivery: "files",
    releaseId: version,
    version,
    createdAt: new Date(0).toISOString(),
    baseUrl: "https://example.com",
    size: Object.values(files).reduce((sum, file) => sum + file.size, 0),
    fileCount: Object.keys(files).length,
    minimumNativeVersion: "0.2.0",
    requiredCapabilities: [],
    mandatory: false,
    notes: "test",
    files,
    signature: "test",
  };
}

async function main(): Promise<void> {
  const local = manifest("1.0.0", {
    "same.js": { sha256: "a".repeat(64), size: 10 },
    "old.js": { sha256: "b".repeat(64), size: 20 },
  });
  const remote = manifest("1.0.1", {
    "same.js": { sha256: "a".repeat(64), size: 10 },
    "new.js": { sha256: "c".repeat(64), size: 30 },
  });
  const plan = planOtaDelta(local, remote);
  assert.deepEqual(plan, {
    changed: ["new.js"],
    deleted: ["old.js"],
    downloadBytes: 30,
  });
  assert.deepEqual(
    pendingDeltaFiles(plan, remote, {
      releaseId: remote.releaseId,
      version: remote.version,
      completed: { "new.js": "c".repeat(64) },
    }),
    [],
  );
  assert.deepEqual(
    pendingDeltaFiles(plan, remote, {
      releaseId: "stale",
      version: remote.version,
      completed: { "new.js": "c".repeat(64) },
    }),
    ["new.js"],
  );

  // -------------------------------------------------------------------------
  // Signing payload compatibility
  // -------------------------------------------------------------------------
  {
    const base = manifest("1.0.0", { "a.js": { sha256: "a".repeat(64), size: 1 } });

    // An empty optional set must not appear in the signed bytes. This is what
    // lets a client built before the field existed keep verifying releases:
    // the transition release signs exactly the pre-split payload.
    assert.equal(
      canonicalOtaManifestPayload(base).includes("optionalCapabilities"),
      false,
      "an absent optional set must not enter the signing payload",
    );
    assert.equal(
      canonicalOtaManifestPayload({ ...base, optionalCapabilities: [] }).includes(
        "optionalCapabilities",
      ),
      false,
      "an empty optional set must not enter the signing payload",
    );
    assert.equal(
      canonicalOtaManifestPayload({
        ...base,
        optionalCapabilities: ["barcode.scan"],
      }).includes("optionalCapabilities"),
      true,
      "a declared optional set must be signed, not left tamperable",
    );

    // The publisher and the client must produce the same bytes. They are one
    // implementation now; this proves the delegation stays in place, because a
    // divergence would reject every release on every device.
    for (const candidate of [
      base,
      { ...base, optionalCapabilities: ["barcode.scan"] },
    ]) {
      assert.equal(
        canonicalManifestPayload(candidate),
        canonicalOtaManifestPayload(candidate),
        "publisher and client signing payloads must be byte-identical",
      );
    }
  }

  // A missing *required* capability blocks the release.
  const gate = await evaluateOtaCapabilities(
    ["camera.takePhoto", "network.status"],
    { missing: async (keys) => keys.filter((key) => key === "network.status") },
  );
  assert.deepEqual(gate, {
    compatible: false,
    missingCapabilities: ["network.status"],
    missingOptionalCapabilities: [],
  });

  // A missing *optional* capability is reported and the release still ships.
  // This is the case that used to stop iOS updating because it has no barcode
  // scanner: one platform-specific feature must not close the channel.
  const optionalGate = await evaluateOtaCapabilities(
    ["camera.takePhoto"],
    { missing: async (keys) => keys.filter((key) => key === "barcode.scan") },
    ["barcode.scan"],
  );
  assert.deepEqual(optionalGate, {
    compatible: true,
    missingCapabilities: [],
    missingOptionalCapabilities: ["barcode.scan"],
  });

  assert.deepEqual(
    scanBuiltCapabilities({
      "asol-required-capabilities.json": {
        bytes: Buffer.from(
          '{"required":["network.status","camera.takePhoto"],"optional":["barcode.scan"]}',
        ),
      },
    }),
    {
      required: ["camera.takePhoto", "network.status"],
      optional: ["barcode.scan"],
    },
  );
  // The split is derived from the shell declarations, never hand-written.
  assert.deepEqual(
    splitCapabilityRequirements(["barcode.scan", "camera.takePhoto"]),
    { required: ["camera.takePhoto"], optional: ["barcode.scan"] },
  );

  // Below the floor the field is withheld, so the signing payload stays
  // verifiable by clients that predate it. At or above it, the field ships.
  assert.deepEqual(resolveOptionalCapabilities("0.2.0", ["barcode.scan"]), {
    optional: [],
    withheld: ["barcode.scan"],
  });
  assert.deepEqual(resolveOptionalCapabilities("0.2.1", ["barcode.scan"]), {
    optional: ["barcode.scan"],
    withheld: [],
  });
  assert.deepEqual(resolveOptionalCapabilities("1.0.0", ["barcode.scan"]), {
    optional: ["barcode.scan"],
    withheld: [],
  });

  // -------------------------------------------------------------------------
  // A key the targeted client cannot name must never reach the manifest
  // -------------------------------------------------------------------------
  {
    // A shipped client answers `false` for any key outside its own vocabulary,
    // so listing `app.state` in a manifest aimed at 0.2.0 would make every
    // installed device refuse every release, forever. The plugin is present in
    // that shell, so withholding the word for it guards nothing less.
    const aimedAtShipped = resolveManifestCapabilities("0.2.0", {
      required: ["app.state", "camera.takePhoto"],
      optional: ["barcode.scan"],
    });
    assert.deepEqual(aimedAtShipped.required, ["camera.takePhoto"]);
    assert.deepEqual(aimedAtShipped.optional, []);
    assert.deepEqual(aimedAtShipped.withheldUnnamed, ["app.state"]);
    assert.deepEqual(aimedAtShipped.withheldOptional, ["barcode.scan"]);

    // Once the store build that names the key is the floor, it is published.
    const aimedAtNext = resolveManifestCapabilities("0.2.1", {
      required: ["app.state", "camera.takePhoto"],
      optional: ["barcode.scan"],
    });
    assert.deepEqual(aimedAtNext.required, ["app.state", "camera.takePhoto"]);
    assert.deepEqual(aimedAtNext.optional, ["barcode.scan"]);
    assert.deepEqual(aimedAtNext.withheldUnnamed, []);
    assert.deepEqual(aimedAtNext.withheldOptional, []);

    // Withholding is only ever safe when the plugin is actually there. A
    // capability no targeted shell contains is a store release, not a silent
    // omission — that is the golden rule, and it must still fail loudly.
    assert.throws(
      () =>
        resolveManifestCapabilities("0.1.0", {
          required: ["camera.takePhoto"],
          optional: [],
        }),
      /needs capabilities that shells at minimumNativeVersion=0\.1\.0 do not contain/,
    );
  }
  assert.throws(
    () => scanBuiltCapabilities({}),
    /Missing asol-required-capabilities\.json; run npm run build:static/,
  );
  assert.throws(
    () =>
      scanBuiltCapabilities({
        "asol-required-capabilities.json": {
          bytes: Buffer.from('{"required":["unknown.capability"]}'),
        },
      }),
    /Invalid asol-required-capabilities\.json; run npm run build:static/,
  );
  // The pre-split array shape is no longer accepted; the build always emits
  // the object form, so a bare array means a stale or hand-edited artifact.
  assert.throws(
    () =>
      scanBuiltCapabilities({
        "asol-required-capabilities.json": {
          bytes: Buffer.from('["camera.takePhoto"]'),
        },
      }),
    /Invalid asol-required-capabilities\.json; run npm run build:static/,
  );

  let active = 0;
  let maximum = 0;
  await runBounded(
    Array.from({ length: 24 }, (_, index) => index),
    6,
    async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
    },
  );
  assert.equal(maximum, 6);
  console.log("OTA delivery tests passed.");
}
void main();
