/** Single responsibility: verify revocation, manifest canonicalization, history, and supersession contracts. */
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalManifestPayload, type OtaManifest as ScriptManifest } from "../../../../scripts/ota/ota-config";
import {
  changedPathsFromHistory,
  selectRecentHistoryKeys,
  staleBundleKeys,
} from "../../../../scripts/ota/ota-bundle-history";
import { createSignedRevocationDocument } from "../../../../scripts/ota/ota-revocation";
import { canonicalOtaClientPayload } from "../services/ota-update-service";
import type { OtaManifest } from "../types/ota.types";
import {
  canonicalOtaRevocationPayload,
  isValidOtaRevocationDocument,
  verifyOtaRevocationDocument,
} from "../utils/ota-revocation-document";
import { compareOtaCanonicalStrings } from "../utils/ota-canonical-order";
import {
  acceptOtaRevocationDocument,
  type PersistedOtaRevocationState,
} from "../utils/ota-revocation-state";
import {
  nativeDownloadPollAction,
  shouldPersistNativeDownloadProgress,
  shouldSupersedePending,
} from "../utils/ota-state";
import {
  mergeRevokedVersions,
  verifySignedRevocationDocument,
} from "../../../../scripts/ota/ota-revocation";
import { canonicalOtaManifestPayload } from "../utils/ota-signature-payload";
import { isOtaRolloutEligible, otaRolloutBucket } from "../utils/ota-rollout";
import { OtaStaleRemoteFileError } from "../utils/ota-stale-file-error";
import { summarizeOtaAdoption } from "../utils/ota-adoption";
import type { PersistentSystemLogEntry } from "../../system-logs/entities/persistent-system-log.entity";

function manifest(version = "1.0.4"): OtaManifest {
  return {
    schemaVersion: 2,
    delivery: "files",
    releaseId: `${version}-release`,
    version,
    createdAt: new Date(0).toISOString(),
    baseUrl: "https://example.com/app-updates/files",
    size: 3,
    fileCount: 2,
    minimumNativeVersion: "0.2.0",
    requiredCapabilities: ["share.send", "backgroundDownload.bundle"],
    mandatory: false,
    notes: "test",
    files: {
      "b.js": { sha256: "b".repeat(64), size: 2 },
      "a.js": { sha256: "a".repeat(64), size: 1 },
    },
    bundles: {
      full: { path: "bundles/r/full.zip", sha256: "f".repeat(64), size: 20 },
      deltas: [
        { path: "bundles/r/from-1.0.3.zip", fromVersion: "1.0.3", sha256: "d".repeat(64), size: 9 },
        { path: "bundles/r/from-1.0.2.zip", fromVersion: "1.0.2", sha256: "e".repeat(64), size: 11 },
      ],
    },
  };
}

async function main(): Promise<void> {
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicKey = keys.publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const revocations = createSignedRevocationDocument(
    ["1.0.3", "1.0.2", "1.0.3"],
    "2026-08-02T00:00:00.000Z",
    privateKey,
  );
  assert.deepEqual(revocations.revokedVersions, ["1.0.2", "1.0.3"]);
  assert.equal(
    canonicalOtaRevocationPayload(revocations),
    '{"schemaVersion":1,"issuedAt":"2026-08-02T00:00:00.000Z","revokedVersions":["1.0.2","1.0.3"]}',
  );
  assert.ok(await verifyOtaRevocationDocument(revocations, publicKey));
  assert.equal(
    await verifyOtaRevocationDocument(
      { ...revocations, revokedVersions: ["1.0.2", "1.0.4"] },
      publicKey,
    ),
    null,
  );
  const prereleaseVersions = ["1.0.0-alpha", "1.0.0-Beta"];
  const canonicalPrereleases = [...prereleaseVersions].sort(compareOtaCanonicalStrings);
  assert.deepEqual(canonicalPrereleases, ["1.0.0-Beta", "1.0.0-alpha"]);
  const prereleaseDocument = createSignedRevocationDocument(
    prereleaseVersions,
    "2026-08-02T00:00:01.000Z",
    privateKey,
  );
  assert.equal(isValidOtaRevocationDocument(prereleaseDocument), true);
  assert.ok(await verifyOtaRevocationDocument(prereleaseDocument, publicKey));
  assert.ok(verifySignedRevocationDocument(prereleaseDocument, privateKey));

  const persisted: PersistedOtaRevocationState = {
    document: prereleaseDocument,
    highestIssuedAt: prereleaseDocument.issuedAt,
  };
  const replay = createSignedRevocationDocument(
    ["1.0.0-Beta"],
    "2026-08-01T23:59:59.000Z",
    privateKey,
  );
  assert.equal(acceptOtaRevocationDocument(persisted, replay).accepted, false);
  assert.equal(
    acceptOtaRevocationDocument(persisted, prereleaseDocument).accepted,
    true,
    "equal issuedAt is accepted",
  );
  assert.deepEqual(
    mergeRevokedVersions(["1.0.1"], ["1.0.1", "1.0.0-Beta"]),
    { merged: ["1.0.0-Beta", "1.0.1"], recovered: ["1.0.0-Beta"] },
  );
  assert.equal(
    await verifyOtaRevocationDocument(
      { ...revocations, revokedVersions: ["1.0.3", "1.0.2"] },
      publicKey,
    ),
    null,
  );

  const payload = manifest();
  assert.equal(
    canonicalOtaClientPayload(payload),
    canonicalManifestPayload(payload as ScriptManifest),
    "publisher and client canonical payloads must be byte-identical",
  );
  assert.equal(
    canonicalOtaManifestPayload(payload),
    canonicalManifestPayload(payload as ScriptManifest),
    "shared verifier and publisher canonical payloads must be byte-identical",
  );

  assert.equal(nativeDownloadPollAction("pending", false), "wait");
  assert.equal(nativeDownloadPollAction("downloading", false), "wait");
  assert.equal(nativeDownloadPollAction("verifying", false), "wait");
  assert.equal(nativeDownloadPollAction("completed", false), "complete");
  assert.equal(nativeDownloadPollAction("failed", false), "fail");
  assert.equal(nativeDownloadPollAction("missing", false), "reschedule");
  assert.equal(nativeDownloadPollAction("missing", true), "fail");
  assert.equal(shouldPersistNativeDownloadProgress(1, 2, 0, 4_999), false);
  assert.equal(shouldPersistNativeDownloadProgress(1, 1, 0, 5_000), false);
  assert.equal(shouldPersistNativeDownloadProgress(1, 2, 0, 5_000), true);
  const rolloutBucket = otaRolloutBucket("release-a", "anonymous-install-a");
  assert.equal(isOtaRolloutEligible("release-a", "anonymous-install-a", rolloutBucket), false);
  assert.equal(isOtaRolloutEligible("release-a", "anonymous-install-a", rolloutBucket + 1), true);
  assert.equal(isOtaRolloutEligible("release-a", "anonymous-install-a", 100), true);
  assert.equal(isOtaRolloutEligible("release-a", "", 50), false);
  assert.equal(new OtaStaleRemoteFileError("a.js").filePath, "a.js");
  assert.deepEqual(
    summarizeOtaAdoption([
      {
        feature: "ota",
        operation: "activation_succeeded",
        message: "local=1.0.3;target=1.0.4;platform=android;reason=none",
        occurrences: 3,
      } as PersistentSystemLogEntry,
      {
        feature: "ota",
        operation: "download_failed",
        message: "local=1.0.3;target=1.0.4;platform=ios;reason=transport",
        occurrences: 2,
      } as PersistentSystemLogEntry,
      {
        feature: "other",
        operation: "activation_succeeded",
        message: "target=ignored",
        occurrences: 99,
      } as PersistentSystemLogEntry,
    ]),
    [{
      version: "1.0.4",
      outcomes: { activation_succeeded: 3, download_failed: 2 },
    }],
  );

  const historyPrefix = "app-updates/history";
  const historyKeys = ["1.0.1", "1.0.4", "1.0.2", "1.0.3"].map(
    (version) => `${historyPrefix}/${version}.json`,
  );
  assert.deepEqual(selectRecentHistoryKeys(historyKeys, historyPrefix), [
    `${historyPrefix}/1.0.4.json`,
    `${historyPrefix}/1.0.3.json`,
    `${historyPrefix}/1.0.2.json`,
  ]);
  assert.deepEqual(selectRecentHistoryKeys([], historyPrefix), []);
  assert.deepEqual(
    staleBundleKeys(
      ["app-updates/bundles/old/full.zip", "app-updates/bundles/current/full.zip"],
      "app-updates/bundles/current",
    ),
    ["app-updates/bundles/old/full.zip"],
  );
  assert.deepEqual(
    changedPathsFromHistory(payload.files, {
      ...payload,
      version: "1.0.3",
      files: { "a.js": payload.files["a.js"]!, "old.js": { sha256: "0".repeat(64), size: 1 } },
    }, payload.baseUrl),
    ["b.js"],
  );

  assert.equal(shouldSupersedePending("1.0.2", "1.0.3"), true);
  assert.equal(shouldSupersedePending("1.0.3", "1.0.3"), false);
  assert.equal(shouldSupersedePending("1.0.4", "1.0.3"), false);

  const serviceSource = readFileSync("src/features/ota/services/ota-update-service.ts", "utf8");
  assert.equal(serviceSource.includes("verifyOtaBundleChunks"), false, "native bundles cross the JS bridge once");
  assert.equal(serviceSource.includes("shouldSupersedePending"), true);
  const splashSource = serviceSource.split("async prepareAtSplash", 2)[1]!;
  assert.equal(splashSource.includes("otaRevocationService"), false, "splash performs no revocation discovery");
  assert.equal(serviceSource.includes("REVOCATION_TIMEOUT_MS = 3_000"), true);
  assert.equal(serviceSource.includes("getPersistedDocument().then(resolve)"), true);
  assert.equal(serviceSource.includes("NATIVE_DOWNLOAD_TIMEOUT_MS = 60 * 60 * 1_000"), true);
  assert.equal(serviceSource.includes("alreadyRescheduledMissing"), false);
  assert.equal(serviceSource.includes("revertToNativeBaseline"), true);
  assert.equal(serviceSource.includes("staleFileRetryUsed"), true);
  assert.equal(serviceSource.includes("OtaStaleRemoteFileError"), true);
  assert.equal(
    serviceSource.split("async function provisionWorkingBaseline", 2)[1]!
      .split("async function finalizePending", 1)[0]!
      .includes("throw new OtaStaleRemoteFileError(path)"),
    true,
    "baseline publish races retry full discovery too",
  );
  assert.equal(serviceSource.includes("OTA_BASELINE_CONCURRENCY = 24"), true);
  assert.equal(serviceSource.includes("OTA_BASELINE_CHECKPOINT_FILES = 32"), true);
  assert.equal(serviceSource.includes("storageCapacity.getFreeSpace()"), true);
  const revocationServiceSource = readFileSync("src/features/ota/services/ota-revocation-service.ts", "utf8");
  assert.equal(revocationServiceSource.includes("REVOCATION_STATE_KEY"), true);
  assert.equal(revocationServiceSource.includes("await asolDbSet("), true);
  assert.equal(revocationServiceSource.includes("cachedDocument = null"), false);
  assert.equal(revocationServiceSource.includes("Rejected stale revocation document"), true);
  assert.equal(revocationServiceSource.includes("highestIssuedAt"), true);
  const staleRejectionSource = revocationServiceSource
    .split("if (!decision.accepted)", 2)[1]!
    .split("await asolDbSet", 1)[0]!;
  assert.equal(staleRejectionSource.includes("cachedAt = Date.now()"), true);
  const adapterSource = readFileSync("src/platform/ota/capacitor-ota-adapter.ts", "utf8");
  assert.equal(adapterSource.includes('setServerAssetPath({ path: "public" })'), true);
  assert.equal(adapterSource.includes("persistServerBasePath()"), true);
  const ensureDirectorySource = adapterSource
    .split("async function createOrConfirmDirectory", 2)[1]!
    .split("async function ensureDirectory", 1)[0]!;
  assert.equal(
    ensureDirectorySource.includes("Filesystem.readdir"),
    true,
    "OTA directory creation must inspect the parent instead of logging an expected mkdir rejection",
  );
  assert.equal(
    ensureDirectorySource.includes("recursive: false"),
    true,
    "the inspected parent is created first, so mkdir must only create the missing leaf",
  );
  assert.equal(
    adapterSource.includes("ensuringDirectories.get(path)"),
    true,
    "concurrent writes must share one directory creation request",
  );
  // The candidate is cloned once before downloading, so activation copies
  // nothing and peak storage stays at the two trees the free-space check
  // reserves. Copying at activation time would exceed that reservation.
  const prepareReleaseSource = adapterSource
    .split("async prepareRelease", 2)[1]!
    .split("async releaseExists", 1)[0]!;
  assert.equal(prepareReleaseSource.includes("from: sourceRoot"), true);
  assert.equal(prepareReleaseSource.includes("to: candidateRoot"), true);
  const finalizeCandidateSource = adapterSource
    .split("async finalizeCandidate", 2)[1]!
    .split("async rollbackDelta", 1)[0]!;
  assert.equal(finalizeCandidateSource.includes("Filesystem.copy"), false, "activation copies nothing");
  assert.equal(finalizeCandidateSource.includes("removeFile"), true);
  assert.equal(adapterSource.includes("async applyDelta"), false, "in-place delta application is gone");
  const activateSource = readFileSync("src/features/ota/services/ota-update-service.ts", "utf8")
    .split("state.activation = {", 2)[1]!
    .split("checkAndDownload", 1)[0]!;
  assert.equal(activateSource.includes("capacitorOtaAdapter.activate(pending.path)"), true);
  assert.equal(adapterSource.includes("async confirmActivation"), true);
  const revokeScript = readFileSync("scripts/ota/ota-revoke.ts", "utf8");
  assert.equal(revokeScript.includes("build:static"), false);
  assert.equal(revokeScript.includes("manifest.json"), false);
  assert.equal(revokeScript.includes("revocations.json"), true);
  const publisherSource = readFileSync("scripts/ota-publish.ts", "utf8");
  assert.equal(publisherSource.includes("readTrackedRevokedVersions"), true);
  assert.equal(publisherSource.includes("readVerifiedLiveRevocationDocument"), true);
  assert.equal(publisherSource.includes("mergeRevokedVersions"), true);
  const outcomeSource = readFileSync("src/features/ota/services/ota-outcome-logger.ts", "utf8");
  assert.equal(outcomeSource.includes("ingestBatch"), true);
  assert.equal(outcomeSource.includes("uid:"), false, "OTA telemetry sends no account identity");
  const storageSource = readFileSync("src/native-platform/storage-capacity/storage-capacity.ts", "utf8");
  assert.equal(storageSource.includes("NativePlatformError.unavailable"), true);
  const capabilityScanSource = readFileSync("scripts/ota/ota-capability-scan.ts", "utf8");
  assert.equal(
    capabilityScanSource.includes('["storageCapacity.getFreeSpace", CapabilityKeys.StorageCapacityFreeSpace]'),
    true,
  );
  assert.equal(publisherSource.includes("staleBundleKeys"), true);
  const androidSource = readFileSync("android/app/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java", "utf8");
  assert.equal(androidSource.includes('MessageDigest.getInstance("SHA-256")'), true);
  assert.equal(androidSource.includes('result.put("status", "verifying")'), true);
  const iosSource = readFileSync("ios/App/App/BackgroundDownloadPlugin.swift", "utf8");
  assert.equal(iosSource.includes("var hasher = SHA256()"), true);
  assert.equal(iosSource.includes('defaults.set("verifying"'), true);
  console.log("OTA hardening tests passed.");
}

void main();
