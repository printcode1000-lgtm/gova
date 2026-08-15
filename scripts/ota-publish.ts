import { execSync } from "node:child_process";
import { createHash, sign } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import {
  API_BASE_URL,
  MINIMUM_SUPPORTED_NATIVE_VERSION,
  OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION,
} from "@asol/native-core";
import { compareOtaCanonicalStrings } from "../src/features/ota/utils/ota-canonical-order";
import { compareOtaVersions } from "../src/features/ota/utils/ota-state";
import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import { assertReleaseStaticBundle } from "./assert-release-static-bundle";
import {
  formatReport,
  inspectNativeCompatibility,
  nativeVersionFromBaseline,
  resolveNativeBaseline,
  undeclarableNativeChanges,
} from "./ota/ota-native-compatibility";
import {
  OTA_SCHEMA_VERSION,
  canonicalManifestPayload,
  getOtaManifestUrl,
  getOtaPrefix,
  getOtaPrivateKey,
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
  otaClientBuildEnv,
  type OtaManifest,
  type OtaManifestPayload,
} from "./ota/ota-config";
import {
  createOtaR2Client,
  deleteOtaObjects,
  getOtaManifestObject,
  listOtaObjectKeys,
  otaObjectExists,
  putOtaObject,
} from "./ota/ota-r2";
import {
  resolveManifestCapabilities,
  scanBuiltCapabilities,
} from "./ota/ota-capability-scan";
import {
  hasLegacyOtaOrigin,
  mirrorLegacyOtaManifest,
} from "./ota/ota-mirror-legacy-manifest";
import {
  changedPathsFromHistory,
  selectRecentHistoryKeys,
  staleBundleKeys,
} from "./ota/ota-bundle-history";
import {
  createSignedRevocationDocument,
  mergeRevokedVersions,
  readTrackedRevokedVersions,
  writeTrackedRevokedVersions,
} from "./ota/ota-revocation";
import { readVerifiedLiveRevocationDocument } from "./ota/ota-live-revocation";

import { LOCAL_MANIFEST_FILE, args, dryRun, mandatory, notesArguments, notesOverride, minimumNativeArguments, minimumNativeOverride, collectFiles, uploadFilesConcurrently, contentTypeFor, automaticNotes, assertNativeCompatibility } from "./ota-publish/ota-publish.publish-types";
import { nextContentVersion, readAndroidNativeVersion } from "./ota/ota-release-line";

if (args.includes("--notes") || notesArguments.length > 1) throw new Error("Release notes must use exactly one --notes=<value> argument.");

if (
  args.includes("--minimum-native-version") ||
  minimumNativeArguments.length > 1
) {
  throw new Error(
    "The minimum native version must use exactly one --minimum-native-version=<x.y.z> argument.",
  );
}

if (minimumNativeOverride !== undefined && !/^\d+\.\d+\.\d+$/.test(minimumNativeOverride)) {
  throw new Error(
    `Invalid --minimum-native-version=${minimumNativeOverride}. Expected x.y.z, ` +
      "matching a native version that has actually shipped.",
  );
}

if (notesArguments.length && (!notesOverride?.trim() || notesOverride.startsWith("--"))) throw new Error("Release notes must be non-empty and cannot begin with --.");

async function main(): Promise<void> {
  loadOtaEnvironment();

  const minimumNativeVersion = assertNativeCompatibility();

  // `--dry-run` verifies the compatibility gate without building or touching
  // R2. Use it to test the gate; a real run overwrites the live channel.
  if (dryRun) {
    console.log(
      `Dry run: the compatibility gate passed and would stamp ` +
        `minimumNativeVersion=${minimumNativeVersion}. Nothing was built or uploaded.`,
    );
    return;
  }

  const prefix = getOtaPrefix();
  const manifestKey = `${prefix}/manifest.json`;
  const filesPrefix = `${prefix}/files`;
  const historyPrefix = `${prefix}/history`;
  const client = createOtaR2Client();
  const privateKey = getOtaPrivateKey();
  const revocationKey = `${prefix}/revocations.json`;
  const trackedRevocations = readTrackedRevokedVersions();
  const liveRevocations = await readVerifiedLiveRevocationDocument(
    client,
    revocationKey,
    privateKey,
  );
  const { merged: mergedRevocations, recovered: recoveredRevocations } =
    mergeRevokedVersions(
      trackedRevocations,
      liveRevocations?.revokedVersions ?? [],
    );
  if (recoveredRevocations.length) {
    writeTrackedRevokedVersions(mergedRevocations);
    console.warn(
      "\n*** OTA REVOCATION DRIFT RECOVERED ***\n" +
        `Recovered from the live signed document: ${recoveredRevocations.join(", ")}\n` +
        "The tracked revocation file was updated; commit it before publishing.\n",
    );
  }
  const previousManifest = (await otaObjectExists(client, manifestKey))
    ? await getOtaManifestObject(client, manifestKey)
    : null;
  // The content line follows the shell the project currently builds, not the
  // declared minimum: an OTA that also runs on older shells still belongs to
  // the newest line, and borrowing the lower number would move the published
  // version backwards.
  const nativeLine = readAndroidNativeVersion();
  const version = nextContentVersion(previousManifest?.version ?? null, nativeLine);
  const now = new Date();
  const notes = notesOverride ?? automaticNotes(now);
  const apiBaseUrl = (
    process.env.ASOL_API_BASE_URL ?? API_BASE_URL
  ).replace(/\/$/, "");
  const buildEnv: NodeJS.ProcessEnv = {
    ...withoutVsCodeDebuggerEnv(process.env),
    ...otaClientBuildEnv(version, minimumNativeVersion),
    NEXT_PUBLIC_ASOL_API_BASE_URL: apiBaseUrl,
  };

  const existingManifestPath = path.resolve("out", LOCAL_MANIFEST_FILE);
  if (existsSync(existingManifestPath)) assertReleaseStaticBundle(existingManifestPath);

  console.log(`R2 current version: ${previousManifest?.version ?? "none"}`);
  console.log(`Automatically selected version: ${version}`);
  console.log(`Release notes: ${notes}`);
  execSync("npm run build:static", { stdio: "inherit", env: buildEnv });
  const localManifestPath = path.resolve("out", LOCAL_MANIFEST_FILE);
  assertReleaseStaticBundle(localManifestPath);

  const files = collectFiles(path.resolve("out"));
  const {
    required: requiredCapabilities,
    optional: optionalCapabilities,
    withheldUnnamed,
    withheldOptional,
  } = resolveManifestCapabilities(
    minimumNativeVersion,
    scanBuiltCapabilities(files),
  );
  if (withheldUnnamed.length > 0) {
    console.log(
      `Withholding capabilities the targeted clients cannot name ` +
        `(${withheldUnnamed.join(", ")}): minimumNativeVersion=${minimumNativeVersion} ` +
        `predates these keys. Every targeted shell already contains the plugins, ` +
        `so nothing is left unguarded; listing them would make those clients ` +
        `refuse the release outright.`,
    );
  }
  if (withheldOptional.length > 0) {
    console.log(
      `Withholding optionalCapabilities (${withheldOptional.join(", ")}): ` +
        `minimumNativeVersion=${minimumNativeVersion} is below ` +
        `${OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION}, and clients built before the ` +
        `field existed cannot verify a manifest that contains it.`,
    );
  }
  const publicRoot = getOtaPublicBaseUrl();
  const baseUrl = `${publicRoot}/${filesPrefix}`;
  const isSingleDirectoryLayout =
    previousManifest?.baseUrl.replace(/\/$/, "") === baseUrl;
  const changedPaths = Object.entries(files)
    .filter(([filePath, file]) => {
      const previous = previousManifest?.files[filePath];
      return (
        !isSingleDirectoryLayout ||
        previous?.sha256 !== file.sha256 ||
        previous.size !== file.size
      );
    })
    .map(([filePath]) => filePath);
  const uploadPaths = Object.keys(files).filter(
    (filePath) =>
      changedPaths.includes(filePath) ||
      path.extname(filePath).toLowerCase() === ".json",
  );

  const releaseId = `${version}-${now.getTime()}`;
  const bundlePrefix = `${prefix}/bundles/${releaseId}`;
  const zipFiles = (paths: readonly string[]) =>
    Buffer.from(
      zipSync(
        Object.fromEntries(paths.map((filePath) => [filePath, files[filePath]!.bytes])),
        { level: 6 },
      ),
    );
  const fullBundle = zipFiles(Object.keys(files));
  const existingHistoryKeys = await listOtaObjectKeys(client, `${historyPrefix}/`);
  const sourceHistoryKeys = selectRecentHistoryKeys(existingHistoryKeys, historyPrefix);
  const historyManifests = await Promise.all(
    sourceHistoryKeys.map((key) => getOtaManifestObject(client, key)),
  );
  const deltaBundles = historyManifests
    .map((base) => {
      const paths = changedPathsFromHistory(files, base, baseUrl);
      const bundle = zipFiles(paths);
      return { base, bundle };
    })
    .sort((left, right) => compareOtaCanonicalStrings(left.base.version, right.base.version));
  const bundleMetadata = (bundle: Buffer, objectPath: string) => ({
    path: objectPath.slice(prefix.length + 1),
    sha256: createHash("sha256").update(bundle).digest("hex"),
    size: bundle.byteLength,
  });

  const expectedKeys = new Set(
    Object.keys(files).map((filePath) => `${filesPrefix}/${filePath}`),
  );
  const existingKeys = await listOtaObjectKeys(client, `${filesPrefix}/`);
  const deletedKeys = existingKeys.filter((key) => !expectedKeys.has(key));

  console.log(
    `R2 delta: ${changedPaths.length} changed/new, ${deletedKeys.length} deleted`,
  );
  const publishWindowStartedAt = Date.now();
  await uploadFilesConcurrently(uploadPaths, async (filePath) => {
    const file = files[filePath]!;
    await putOtaObject(
      client,
      `${filesPrefix}/${filePath}`,
      file.bytes,
      contentTypeFor(filePath),
      "public, max-age=0, must-revalidate",
    );
  });
  await deleteOtaObjects(client, deletedKeys);
  await putOtaObject(
    client,
    `${bundlePrefix}/full.zip`,
    fullBundle,
    "application/zip",
    "public, max-age=31536000, immutable",
  );
  for (const { base, bundle } of deltaBundles) {
    await putOtaObject(
      client,
      `${bundlePrefix}/from-${base.version}.zip`,
      bundle,
      "application/zip",
      "public, max-age=31536000, immutable",
    );
  }

  const size = Object.values(files).reduce(
    (total, file) => total + file.size,
    0,
  );
  const payload: OtaManifestPayload = {
    schemaVersion: OTA_SCHEMA_VERSION,
    delivery: "files",
    releaseId,
    version,
    createdAt: now.toISOString(),
    baseUrl,
    size,
    fileCount: Object.keys(files).length,
    minimumNativeVersion,
    requiredCapabilities,
    // Omitted when empty so the signing payload stays byte-identical to the
    // pre-split schema and clients built before this field still verify.
    ...(optionalCapabilities.length > 0 ? { optionalCapabilities } : {}),
    mandatory,
    notes,
    files: Object.fromEntries(
      Object.entries(files).map(([filePath, file]) => [
        filePath,
        { sha256: file.sha256, size: file.size },
      ]),
    ),
    bundles: {
      full: bundleMetadata(fullBundle, `${bundlePrefix}/full.zip`),
      deltas: deltaBundles.map(({ base, bundle }) => ({
        ...bundleMetadata(bundle, `${bundlePrefix}/from-${base.version}.zip`),
        fromVersion: base.version,
      })),
    },
  };
  const signature = sign(
    "sha256",
    Buffer.from(canonicalManifestPayload(payload)),
    {
      key: privateKey,
      dsaEncoding: "ieee-p1363",
    },
  ).toString("base64");
  const manifest: OtaManifest = { ...payload, signature };

  await putOtaObject(
    client,
    manifestKey,
    JSON.stringify(manifest, null, 2),
    "application/json",
    "no-store, max-age=0",
  );
  console.log(
    `Per-file publish window: ${Date.now() - publishWindowStartedAt} ms ` +
      "(first mutable file upload through manifest commit)",
  );

  await putOtaObject(
    client,
    `${historyPrefix}/${version}.json`,
    JSON.stringify(manifest, null, 2),
    "application/json",
    "public, max-age=31536000, immutable",
  );
  const revocations = createSignedRevocationDocument(
    mergedRevocations,
    now.toISOString(),
    privateKey,
  );
  await putOtaObject(
    client,
    revocationKey,
    JSON.stringify(revocations, null, 2),
    "application/json",
    "no-store, max-age=0",
  );

  const bundleKeys = await listOtaObjectKeys(client, `${prefix}/bundles/`);
  const deletedBundleKeys = staleBundleKeys(bundleKeys, bundlePrefix);
  await deleteOtaObjects(client, deletedBundleKeys);
  const allHistoryKeys = await listOtaObjectKeys(client, `${historyPrefix}/`);
  const retainedHistoryKeys = new Set(selectRecentHistoryKeys(allHistoryKeys, historyPrefix));
  const deletedHistoryKeys = allHistoryKeys.filter((key) => !retainedHistoryKeys.has(key));
  await deleteOtaObjects(client, deletedHistoryKeys);

  const legacyKeys = await listOtaObjectKeys(client, `${prefix}/releases/`);
  await deleteOtaObjects(client, legacyKeys);
  console.log(`Removed ${legacyKeys.length} legacy release objects`);

  // A shell built before the origin moved asks its baked URL, so while a legacy
  // origin is configured the publisher refreshes it here rather than leaving it
  // to a separate command. Forgetting that command left a store-installed
  // device on a stale manifest — and, once removed, on a 404.
  if (hasLegacyOtaOrigin()) {
    console.log("\nRefreshing the legacy OTA origin:");
    await mirrorLegacyOtaManifest();
  }
  console.log(
    `Published ${1 + deltaBundles.length} bundles: full=${fullBundle.byteLength} bytes, ` +
      `deltas=${deltaBundles.map(({ base, bundle }) => `${base.version}:${bundle.byteLength}`).join(", ") || "none"}`,
  );
  console.log(
    `Removed ${deletedBundleKeys.length} stale bundle objects and ${deletedHistoryKeys.length} stale history objects`,
  );
  console.log(`OTA ${version} published to the single current directory`);
  console.log(`Manifest: ${getOtaManifestUrl()}`);
  console.log(`Files: ${payload.fileCount}, total bytes: ${size}`);
  console.log(
    `Required capabilities: ${requiredCapabilities.join(", ") || "none"}`,
  );
  console.log(
    `Optional capabilities (never block a device): ${optionalCapabilities.join(", ") || "none"}`,
  );
}

main().catch((error) => {
  console.error(
    `OTA publish failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
});
