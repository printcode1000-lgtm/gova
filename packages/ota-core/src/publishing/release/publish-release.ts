import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import { compareOtaCanonicalStrings } from "../../domain/release/canonical-order";
import { compareOtaVersions } from "../../domain/versioning/version-ordering";
import { reconcileOtaTargetWithR2 } from "../../domain/versioning/platform-version-truth";
import { nextNativePatchVersion } from "../../domain/versioning/native-version";
import {
  evaluateReleaseGate,
  type GateDecision,
} from "../gate/native-gate";
import { requireGooglePlayProductionNativeVersion } from "../adapters/google-play.adapter";
import {
  getOtaManifestUrl,
  getOtaPrefix,
  getOtaPrivateKey,
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
  otaClientBuildEnv,
} from "../config/ota-config";
import {
  createOtaR2Client,
  deleteOtaObjects,
  getOtaManifestObject,
  listOtaObjectKeys,
  otaObjectExists,
  putOtaObject,
} from "../adapters/r2-storage.adapter";
import {
  resolveManifestCapabilities,
  scanBuiltCapabilities,
} from "./capability-scan";
import {
  changedPathsFromHistory,
  selectRecentHistoryKeys,
  staleBundleKeys,
} from "./history";
import {
  createSignedRevocationDocument,
  mergeRevokedVersions,
  readTrackedRevokedVersions,
  writeTrackedRevokedVersions,
  normalizeRevokedVersions,
} from "./revocation";
import { readVerifiedLiveRevocationDocument } from "./live-revocation";
import { buildStaticOut } from "../build/build-out";
import { readCurrentVersions } from "../versioning/version-reader";
import { writeTreeVersions } from "../versioning/version-writer";
import { assembleAndSignManifest } from "./manifest-assembly";

export interface PublishOtaReleaseOptions {
  notes?: string;
  mandatory?: boolean;
  minimumNativeVersion?: string;
  confirmUpload?: boolean;
  dryRun?: boolean;
  skipGate?: boolean;
}

export interface PublishOtaReleaseResult {
  version: string;
  releaseId: string;
  fileCount: number;
  totalBytes: number;
  manifestUrl: string;
  minimumNativeVersion: string;
  requiredCapabilities: string[];
  optionalCapabilities: string[];
}

export interface CutNativeReleaseOptions {
  action?: "current" | "patch";
  nativeVersion?: string;
  confirmVersionWrite?: boolean;
}

export interface CutNativeReleaseResult {
  nativeVersion: string;
  contentVersion: string;
  androidVersionCode: number;
  filesModified: string[];
}

export interface LocalRefreshResult {
  outDir: string;
  fileCount: number;
  totalBytes: number;
  manifestPath: string;
}

export interface RevokeOtaVersionOptions {
  version: string;
  confirmUpload?: boolean;
}

export interface RevocationResult {
  revokedVersions: string[];
  issuedAt: string;
  uploaded: boolean;
}

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".html": return "text/html; charset=utf-8";
    case ".js":
    case ".mjs": return "application/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".json":
    case ".map": return "application/json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".ico": return "image/x-icon";
    case ".woff2": return "font/woff2";
    case ".woff": return "font/woff";
    case ".ttf": return "font/ttf";
    case ".txt": return "text/plain; charset=utf-8";
    default: return "application/octet-stream";
  }
}

function collectOutFiles(
  root: string,
  current = root,
  result: Record<string, { bytes: Buffer; sha256: string; size: number }> = {},
) {
  const entries = readdirSync(current).sort(compareOtaCanonicalStrings);
  for (const entry of entries) {
    const fullPath = path.join(current, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectOutFiles(root, fullPath, result);
      continue;
    }
    const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
    if (relativePath === "asol-web-manifest.json") continue;
    if (relativePath.split("/").some((segment) => segment.startsWith("."))) continue;
    const bytes = readFileSync(fullPath);
    result[relativePath] = {
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: stats.size,
    };
  }
  return result;
}

async function uploadFilesConcurrently(
  paths: readonly string[],
  uploader: (filePath: string) => Promise<void>,
  concurrency = 24,
): Promise<void> {
  const queue = [...paths];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const filePath = queue.shift();
      if (filePath) await uploader(filePath);
    }
  });
  await Promise.all(workers);
}

export async function publishOtaRelease(
  options: PublishOtaReleaseOptions = {},
): Promise<Result<PublishOtaReleaseResult, OtaCoreError>> {
  try {
    loadOtaEnvironment();

    const nativeLine = options.minimumNativeVersion?.trim()
      ? options.minimumNativeVersion.trim()
      : await requireGooglePlayProductionNativeVersion();

    if (!options.skipGate) {
      const gateRes = await evaluateReleaseGate(nativeLine);
      if (!gateRes.ok) return gateRes;
      if (gateRes.value.state === "blocked") {
        return err(OtaCoreError.gateBlocked(gateRes.value.reason));
      }
    }

    if (options.dryRun) {
      // A dry run verifies the native-compatibility gate and uploads nothing, so it must
      // not require upload configuration. `getOtaManifestUrl()` throws when
      // `ASOL_OTA_R2_PUBLIC_URL` is unset, which made `--dry-run` fail on any machine
      // without the production OTA credentials — including CI, where it failed on every
      // push while passing on every developer's machine.
      //
      // Reported as "" rather than throwing: the caller is being told what a dry run can
      // know, and a dry run cannot know the manifest URL of a release it did not publish.
      let manifestUrl = "";
      try {
        manifestUrl = getOtaManifestUrl();
      } catch {
        manifestUrl = "";
      }

      return ok({
        version: `${nativeLine}.0`,
        releaseId: "dry-run",
        fileCount: 0,
        totalBytes: 0,
        manifestUrl,
        minimumNativeVersion: nativeLine,
        requiredCapabilities: [],
        optionalCapabilities: [],
      });
    }

    if (!options.confirmUpload) {
      return err(
        OtaCoreError.confirmationRequired(
          "uploading OTA release to R2",
          "--confirm-upload",
        ),
      );
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
    }

    const previousManifest = (await otaObjectExists(client, manifestKey))
      ? await getOtaManifestObject(client, manifestKey)
      : null;

    const localVersions = await readCurrentVersions();
    const localContentVersion = localVersions.ok ? localVersions.value.contentVersion : null;
    const otaReconcile = reconcileOtaTargetWithR2(
      previousManifest?.version ?? null,
      nativeLine,
      localContentVersion,
    );
    const version = otaReconcile.target;
    if (otaReconcile.correctedFromLocal) {
      console.log(
        `Correcting phantom local OTA ${localContentVersion} -> ${version} ` +
          `(R2 last published ${previousManifest?.version ?? "(none)"}).`,
      );
    }

    const minimumNativeVersion = nativeLine;
    const now = new Date();
    const notes = options.notes ?? `OTA Release ${version} (${now.toISOString().slice(0, 10)})`;

    const buildEnv = otaClientBuildEnv(version, minimumNativeVersion);
    const buildRes = await buildStaticOut({ env: buildEnv });
    if (!buildRes.ok) return buildRes;

    const files = collectOutFiles(path.resolve("out"));
    const {
      required: requiredCapabilities,
      optional: optionalCapabilities,
    } = resolveManifestCapabilities(
      minimumNativeVersion,
      scanBuiltCapabilities(files),
    );

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

    const manifestFiles = Object.fromEntries(
      Object.entries(files).map(([filePath, file]) => [
        filePath,
        { sha256: file.sha256, size: file.size },
      ]),
    );
    const bundles = {
      full: bundleMetadata(fullBundle, `${bundlePrefix}/full.zip`),
      deltas: deltaBundles.map(({ base, bundle }) => ({
        ...bundleMetadata(bundle, `${bundlePrefix}/from-${base.version}.zip`),
        fromVersion: base.version,
      })),
    };

    const manifest = assembleAndSignManifest({
      version,
      releaseId,
      baseUrl,
      minimumNativeVersion,
      requiredCapabilities,
      optionalCapabilities,
      mandatory: options.mandatory ?? false,
      notes,
      files: manifestFiles,
      bundles,
      privateKey,
      createdAt: now.toISOString(),
    });

    await putOtaObject(
      client,
      manifestKey,
      JSON.stringify(manifest, null, 2),
      "application/json",
      "no-store, max-age=0",
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

    return ok({
      version,
      releaseId,
      fileCount: manifest.fileCount,
      totalBytes: manifest.size,
      manifestUrl: getOtaManifestUrl(),
      minimumNativeVersion,
      requiredCapabilities,
      optionalCapabilities,
    });
  } catch (error) {
    return err(
      OtaCoreError.internal("OTA publish failed", error),
    );
  }
}

export async function cutNativeRelease(
  options: CutNativeReleaseOptions = {},
): Promise<Result<CutNativeReleaseResult, OtaCoreError>> {
  try {
    const productionVersion = await requireGooglePlayProductionNativeVersion();

    let targetVersion = options.nativeVersion;
    if (!targetVersion) {
      targetVersion =
        options.action === "patch"
          ? nextNativePatchVersion(productionVersion)
          : productionVersion;
    }

    const writeRes = writeTreeVersions({
      nativeVersion: targetVersion,
      confirmVersionWrite: options.confirmVersionWrite ?? false,
    });
    if (!writeRes.ok) return writeRes;

    return ok({
      nativeVersion: writeRes.value.androidNativeVersion,
      contentVersion: writeRes.value.contentVersion,
      androidVersionCode: writeRes.value.androidVersionCode,
      filesModified: writeRes.value.filesModified,
    });
  } catch (error) {
    return err(
      OtaCoreError.internal("Failed to cut native release", error),
    );
  }
}

export async function runLocalRefresh(): Promise<Result<LocalRefreshResult, OtaCoreError>> {
  return buildStaticOut({ diagnostic: false });
}

export async function revokeOtaVersion(
  options: RevokeOtaVersionOptions,
): Promise<Result<RevocationResult, OtaCoreError>> {
  try {
    loadOtaEnvironment();
    const client = createOtaR2Client();
    const privateKey = getOtaPrivateKey();
    const prefix = getOtaPrefix();
    const revocationKey = `${prefix}/revocations.json`;

    const tracked = readTrackedRevokedVersions();
    const updated = normalizeRevokedVersions([...tracked, options.version]);
    writeTrackedRevokedVersions(updated);

    const now = new Date().toISOString();
    const document = createSignedRevocationDocument(updated, now, privateKey);

    let uploaded = false;
    if (options.confirmUpload) {
      await putOtaObject(
        client,
        revocationKey,
        JSON.stringify(document, null, 2),
        "application/json",
        "no-store, max-age=0",
      );
      uploaded = true;
    }

    return ok({
      revokedVersions: updated,
      issuedAt: now,
      uploaded,
    });
  } catch (error) {
    return err(
      OtaCoreError.internal("Failed to revoke OTA version", error),
    );
  }
}
