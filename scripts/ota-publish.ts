import { execSync } from "node:child_process";
import { createHash, sign } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import { CAPACITOR_API_BASE_URL } from "../platform/capacitor.defaults";
import { compareOtaCanonicalStrings } from "../src/features/ota/utils/ota-canonical-order";
import {
  MINIMUM_SUPPORTED_NATIVE_VERSION,
  OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION,
} from "../src/native-platform/capabilities/shell-capabilities";
import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import { assertReleaseStaticBundle } from "./assert-release-static-bundle";
import {
  formatReport,
  inspectNativeCompatibility,
  resolveNativeBaseline,
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

const LOCAL_MANIFEST_FILE = "asol-web-manifest.json";
const OTA_UPLOAD_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.ASOL_OTA_UPLOAD_CONCURRENCY ?? "24", 10) || 24,
);
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const mandatory = args.includes("--mandatory");
const notesArguments = args.filter((argument) => argument.startsWith("--notes"));
if (args.includes("--notes") || notesArguments.length > 1) throw new Error("Release notes must use exactly one --notes=<value> argument.");
const notesOverride = notesArguments[0]?.slice("--notes=".length);
if (notesArguments.length && (!notesOverride?.trim() || notesOverride.startsWith("--"))) throw new Error("Release notes must be non-empty and cannot begin with --.");

type CollectedFile = {
  bytes: Buffer;
  sha256: string;
  size: number;
};

function collectFiles(
  root: string,
  current = root,
  result: Record<string, CollectedFile> = {},
) {
  const entries = readdirSync(current).sort(compareOtaCanonicalStrings);
  for (const entry of entries) {
    const fullPath = path.join(current, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(root, fullPath, result);
      continue;
    }

    const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
    if (relativePath === LOCAL_MANIFEST_FILE) continue;
    if (relativePath.split("/").some((segment) => segment.startsWith(".")))
      continue;
    const bytes = readFileSync(fullPath);
    result[relativePath] = {
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.byteLength,
    };
  }
  return result;
}

async function uploadFilesConcurrently<T>(
  items: readonly T[],
  upload: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  let completed = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      await upload(items[index]!);
      completed += 1;
      if (completed === 1 || completed % 100 === 0 || completed === items.length) {
        console.log(`  uploaded ${completed}/${items.length}`);
      }
    }
  };
  await Promise.all(Array.from(
    { length: Math.min(OTA_UPLOAD_CONCURRENCY, items.length) },
    () => worker(),
  ));
}

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".txt") return "text/plain; charset=utf-8";
  // CapacitorHttp parses application/json before honoring arraybuffer, which
  // destroys the original bytes required for OTA SHA-256 verification.
  if (extension === ".json") return "application/octet-stream";
  if (extension === ".js") return "application/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".ico") return "image/x-icon";
  if (extension === ".wasm") return "application/wasm";
  return "application/octet-stream";
}

function nextPatchVersion(current: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(current);
  if (!match) throw new Error(`R2 manifest has an invalid version: ${current}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function automaticNotes(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `Automatic build - ${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}:${value("second")} Africa/Cairo`;
}

/**
 * Enforce the golden rule before anything is uploaded.
 *
 * OTA ships UI and logic that run inside the native capabilities already
 * installed on the device. Any new device capability is a store release.
 *
 * @returns The `minimumNativeVersion` to stamp into the manifest.
 * @throws When the native shell changed and the publisher has not declared a
 *         new minimum version.
 */
function assertNativeCompatibility(): string {
  const baseline = resolveNativeBaseline();
  const report = inspectNativeCompatibility(baseline);
  const declared = process.env.ASOL_OTA_MINIMUM_NATIVE_VERSION?.trim();

  console.log("\nOTA native compatibility");
  console.log(formatReport(report, baseline));

  if (report.baselineMissing) {
    throw new Error(
      "Cannot prove OTA native compatibility: no native baseline found.\n" +
        "Tag the commit the current store build was made from, for example:\n" +
        "  git tag native-v1.0.0 && git push origin native-v1.0.0\n" +
        "Or set ASOL_OTA_NATIVE_BASELINE to that commit.",
    );
  }

  if (report.requiresStoreRelease && !declared) {
    throw new Error(
      "Refusing to publish: the native shell changed since the last store release.\n" +
        "A web bundle that needs a capability the installed shell lacks degrades\n" +
        "silently instead of failing loudly.\n\n" +
        formatReport(report, baseline) +
        "\n\nEither publish a new store build and re-tag the baseline, or, if this\n" +
        "bundle genuinely runs on the older shell, declare the requirement:\n" +
        "  ASOL_OTA_MINIMUM_NATIVE_VERSION=<version> npm run ota:publish",
    );
  }

  // No native surface changed: the bundle runs on any shell that already
  // serves the current release line.
  const resolved =
    declared ||
    process.env.NEXT_PUBLIC_ASOL_NATIVE_VERSION?.trim() ||
    MINIMUM_SUPPORTED_NATIVE_VERSION;
  console.log(
    `minimumNativeVersion: ${resolved}${declared ? " (declared)" : " (inherited)"}\n`,
  );
  return resolved;
}

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
  const packageVersion = (
    JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
  ).version;
  const version = previousManifest
    ? nextPatchVersion(previousManifest.version)
    : packageVersion;
  const now = new Date();
  const notes = notesOverride ?? automaticNotes(now);
  const apiBaseUrl = (
    process.env.ASOL_CAPACITOR_API_BASE_URL ?? CAPACITOR_API_BASE_URL
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
