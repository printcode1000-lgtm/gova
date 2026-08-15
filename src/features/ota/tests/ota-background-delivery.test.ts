/** Single responsibility: verify daily scheduling, bundle safety, and durable task state. */
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { zipSync } from "fflate";

import {
  extractOtaBundle,
  otaBundleCandidates,
  selectOtaBundle,
  selectOtaBundleAttempt,
  type OtaBundleSink,
} from "../utils/ota-bundle";
import {
  clampFutureOtaCheckTimestamp,
  isDailyOtaCheckDue,
  isReadyForOtaActivation,
  migrateOtaState,
  OTA_DAILY_CHECK_INTERVAL_MS,
  reconcileNativeDownloadTask,
  requiredOtaFreeBytes,
  shouldRunOtaCheck,
} from "../utils/ota-state";
import type { OtaDownloadProgress, OtaManifest } from "../types/ota.types";
import {
  canonicalOtaManifestPayload,
  legacyOtaManifestPayload,
} from "../utils/ota-signature-payload";

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function* chunks(bytes: Uint8Array, size = 7): AsyncGenerator<Uint8Array> {
  for (let offset = 0; offset < bytes.length; offset += size)
    yield bytes.slice(offset, offset + size);
}

function manifest(): OtaManifest {
  const a = new TextEncoder().encode("alpha");
  const b = new TextEncoder().encode("beta");
  return {
    schemaVersion: 2,
    delivery: "files",
    releaseId: "1.0.1-release",
    version: "1.0.1",
    createdAt: new Date(0).toISOString(),
    baseUrl: "https://example.com/app-updates/files",
    size: a.length + b.length,
    fileCount: 2,
    minimumNativeVersion: "0.2.0",
    requiredCapabilities: ["backgroundDownload.bundle"],
    mandatory: false,
    notes: "test",
    files: {
      "a.js": { sha256: hash(a), size: a.length },
      "nested/b.js": { sha256: hash(b), size: b.length },
    },
    bundles: {
      full: { path: "bundles/r/full.zip", sha256: "a".repeat(64), size: 20 },
      deltas: [
        { path: "bundles/r/from-0.9.0.zip", fromVersion: "0.9.0", sha256: "c".repeat(64), size: 12 },
        { path: "bundles/r/from-1.0.0.zip", fromVersion: "1.0.0", sha256: "b".repeat(64), size: 10 },
      ],
    },
    signature: "test",
  };
}

function memorySink(files: Map<string, Uint8Array>): OtaBundleSink {
  return {
    async begin(path) { files.set(path, new Uint8Array()); },
    async append(path, bytes) {
      const previous = files.get(path)!;
      const combined = new Uint8Array(previous.length + bytes.length);
      combined.set(previous);
      combined.set(bytes, previous.length);
      files.set(path, combined);
    },
    async verify(path, expected) {
      assert.equal(hash(files.get(path)!), expected.sha256);
    },
  };
}

async function main(): Promise<void> {
  const ota = manifest();
  assert.equal(selectOtaBundle(ota, "1.0.0")?.kind, "delta");
  assert.equal(selectOtaBundle(ota, "0.8.0")?.kind, "full");
  assert.equal(selectOtaBundle({ ...ota, bundles: undefined }, "1.0.0"), null);
  assert.deepEqual(
    otaBundleCandidates(ota, "1.0.0").map(({ kind }) => kind),
    ["delta", "full"],
    "a matching delta always retains the signed full bundle as its fallback",
  );
  assert.deepEqual(
    otaBundleCandidates(ota, "0.8.0").map(({ kind }) => kind),
    ["full"],
  );
  assert.equal(
    selectOtaBundleAttempt(ota, "1.0.0", ota.bundles!.full.path)?.kind,
    "full",
    "process recreation resumes a persisted full-bundle fallback",
  );
  assert.equal(
    selectOtaBundleAttempt(ota, "1.0.0", "bundles/unknown.zip")?.kind,
    "delta",
    "an unknown stale path cannot suppress normal delta selection",
  );

  const legacy = { ...ota, bundles: undefined } as OtaManifest & {
    requiredCapabilities?: string[];
  };
  delete legacy.requiredCapabilities;
  const legacyPayload = legacyOtaManifestPayload(legacy);
  assert.ok(legacyPayload);
  assert.notEqual(legacyPayload, canonicalOtaManifestPayload(legacy));
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const legacySignature = sign("sha256", Buffer.from(legacyPayload), {
    key: keys.privateKey,
    dsaEncoding: "ieee-p1363",
  });
  assert.equal(
    verify(
      "sha256",
      Buffer.from(legacyPayload),
      { key: keys.publicKey, dsaEncoding: "ieee-p1363" },
      legacySignature,
    ),
    true,
  );
  assert.equal(legacyOtaManifestPayload(ota), null);

  const archive = zipSync({
    "a.js": new TextEncoder().encode("alpha"),
    "nested/b.js": new TextEncoder().encode("beta"),
  });
  const files = new Map<string, Uint8Array>();
  assert.deepEqual(
    await extractOtaBundle(chunks(archive), ota.files, memorySink(files)),
    ["a.js", "nested/b.js"],
  );
  await assert.rejects(
    extractOtaBundle(
      chunks(archive),
      { ...ota.files, "a.js": { ...ota.files["a.js"]!, sha256: "0".repeat(64) } },
      memorySink(new Map()),
    ),
  );
  const traversal = zipSync({ "../escape.js": new Uint8Array([1]) });
  await assert.rejects(
    extractOtaBundle(chunks(traversal), { "escape.js": { sha256: hash(new Uint8Array([1])), size: 1 } }, memorySink(new Map())),
    /Unsafe OTA bundle entry path/,
  );

  const now = 1_000_000_000;
  assert.equal(isDailyOtaCheckDue(undefined, now), true);
  assert.equal(isDailyOtaCheckDue(now - 1_000, now), false);
  assert.equal(isDailyOtaCheckDue(now - OTA_DAILY_CHECK_INTERVAL_MS, now), true);
  assert.equal(isDailyOtaCheckDue(now + OTA_DAILY_CHECK_INTERVAL_MS, now), true);
  assert.equal(isDailyOtaCheckDue(now, now - 5_000), true, "a backwards clock jump is due");
  assert.equal(clampFutureOtaCheckTimestamp(now + 1, now), now);
  assert.equal(clampFutureOtaCheckTimestamp(now - 1, now), now - 1);
  assert.equal(requiredOtaFreeBytes(10_000_000, 4_000_000), 28_800_000);
  assert.equal(shouldRunOtaCheck("automatic", now - 1_000, now), false);
  assert.equal(shouldRunOtaCheck("manual", now - 1_000, now), true);

  const oldState = migrateOtaState({
    pending: {
      version: "1.0.1", releaseId: "old", path: "/ota", size: 123,
      notes: "old", downloadedAt: 1, changedFiles: ["a.js"], deletedFiles: [],
    },
    failedReleaseId: "failed",
  });
  assert.equal(oldState.pending?.ready, true);
  assert.equal(oldState.pending?.totalBytes, 123);
  assert.equal(oldState.failedReleaseId, "failed");
  assert.equal(isReadyForOtaActivation(undefined), false);
  assert.equal(isReadyForOtaActivation(oldState.pending), true);

  const current = {
    releaseId: "release", version: "1.0.1", status: "downloading" as const,
    downloadedBytes: 10, totalBytes: 100, nativeTaskId: "42",
  };
  const report = { id: "42", releaseId: "release", status: "completed" as const, bytesDownloaded: 100, totalBytes: 100 };
  const reconciled = reconcileNativeDownloadTask(current, report);
  assert.deepEqual(reconcileNativeDownloadTask(reconciled, report), reconciled);
  assert.equal(reconciled.nativeTaskId, "42", "process recreation reattaches to the persisted task id");
  assert.throws(() => reconcileNativeDownloadTask(current, { ...report, releaseId: "other" }));

  const publicProgress: OtaDownloadProgress = {
    progress: 50, statusKey: "ota.downloading", downloadedBytes: 50, totalBytes: 100,
  };
  assert.deepEqual(Object.keys(publicProgress).sort(), ["downloadedBytes", "progress", "statusKey", "totalBytes"]);

  const splashSource = readFileSync("src/features/ota/services/ota-update-service.ts", "utf8")
    .split("async prepareAtSplash", 2)[1]!;
  assert.equal(splashSource.includes("checkAndDownload("), false);
  assert.equal(splashSource.includes("getManifest("), false);
  assert.equal(splashSource.includes("getFile("), false);
  assert.equal(splashSource.includes("rollbackDelta("), true);
  assert.equal(splashSource.includes("activatePending(identity, true)"), true);
  const activationSource = readFileSync("src/features/ota/services/ota-update-service.ts", "utf8")
    .split("async activatePending", 2)[1]!
    .split("async checkAndDownload", 1)[0]!;
  assert.equal(activationSource.includes("isReadyForOtaActivation"), true, "partial releases never activate");
  assert.equal(activationSource.includes("rollbackDelta("), true, "failed activation rolls back");
  assert.equal(activationSource.includes("holdPendingUntilAllowed"), true, "temporary access denial keeps a ready release");
  assert.equal(activationSource.includes("discardPending"), false, "activation never labels temporary denial as revocation");
  const hookSource = readFileSync("src/features/ota/hooks/use-ota-update.tsx", "utf8");
  assert.equal(hookSource.includes("setInterval"), false);
  assert.equal(hookSource.includes("checkDailyAndDownload"), true);
  assert.equal(hookSource.includes("checkAndDownload(report"), true);
  const checkSource = readFileSync("src/features/ota/services/ota-update-service.ts", "utf8")
    .split("async checkAndDownload", 2)[1]!
    .split("async checkDailyAndDownload", 1)[0]!;
  const failureBlock = checkSource.slice(checkSource.lastIndexOf("} catch (error) {"));
  assert.equal(failureBlock.includes("lastSuccessfulCheckAt"), false, "a failed check does not consume the interval");
  assert.equal(checkSource.includes("downloadNativeBundle("), true, "discovery immediately starts native delivery");
  assert.equal(checkSource.includes("downloadPerFile("), true, "web keeps the per-file fallback");
  assert.equal(
    readFileSync("src/features/ota/services/ota-update-service.ts", "utf8")
      .includes("OTA delta bundle failed; retrying with full bundle"),
    true,
    "a failed delta retries the signed full transport",
  );
  assert.equal(checkSource.includes("minimumNativeVersion"), true, "native version gates delivery");
  assert.equal(checkSource.includes("capabilityDecision.compatible"), true, "capabilities gate delivery");

  const androidPath = existsSync("packages/native-core/android/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java")
    ? "packages/native-core/android/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java"
    : "android/app/src/main/java/hgh/asol/app/BackgroundDownloadPlugin.java";
  const androidSource = readFileSync(androidPath, "utf8");
  assert.equal(androidSource.includes("ACTIVE_RELEASE"), true, "Android enforces one bundle task");
  assert.equal(androidSource.includes("clearRelease(prefs, releaseId, false)"), true, "Android replaces stale persisted task ids");
  const iosPath = existsSync("packages/native-core/ios/Sources/AsolNativeCore/BackgroundDownloadPlugin.swift")
    ? "packages/native-core/ios/Sources/AsolNativeCore/BackgroundDownloadPlugin.swift"
    : "ios/App/App/BackgroundDownloadPlugin.swift";
  const iosSource = readFileSync(iosPath, "utf8");
  assert.equal(iosSource.includes("tasks.filter { $0.taskDescription != releaseId }.forEach { $0.cancel() }"), true, "iOS enforces one bundle task");
  console.log("OTA background delivery tests passed.");
}

void main();
