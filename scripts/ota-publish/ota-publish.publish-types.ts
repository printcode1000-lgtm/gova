import { execSync } from "node:child_process";
import { createHash, sign } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { zipSync } from "fflate";
import {
  API_BASE_URL,
  MINIMUM_SUPPORTED_NATIVE_VERSION,
  OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION,
} from "@asol/native-core";
import { compareOtaVersions } from "../../src/features/ota/utils/ota-state";
import { withoutVsCodeDebuggerEnv } from "../child-process-env";
import { assertReleaseStaticBundle } from "../assert-release-static-bundle";
import {
  formatReport,
  inspectNativeCompatibility,
  nativeVersionFromBaseline,
  resolveNativeBaseline,
  undeclarableNativeChanges,
} from "../ota/ota-native-compatibility";
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
} from "../ota/ota-config";
import {
  createOtaR2Client,
  deleteOtaObjects,
  getOtaManifestObject,
  listOtaObjectKeys,
  otaObjectExists,
  putOtaObject,
} from "../ota/ota-r2";
import {
  resolveManifestCapabilities,
  scanBuiltCapabilities,
} from "../ota/ota-capability-scan";
import {
  hasLegacyOtaOrigin,
  mirrorLegacyOtaManifest,
} from "../ota/ota-mirror-legacy-manifest";
import {
  changedPathsFromHistory,
  selectRecentHistoryKeys,
  staleBundleKeys,
} from "../ota/ota-bundle-history";
import {
  createSignedRevocationDocument,
  mergeRevokedVersions,
  readTrackedRevokedVersions,
  writeTrackedRevokedVersions,
} from "../ota/ota-revocation";
import { readVerifiedLiveRevocationDocument } from "../ota/ota-live-revocation";

export const LOCAL_MANIFEST_FILE = "asol-web-manifest.json";

export const OTA_UPLOAD_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.ASOL_OTA_UPLOAD_CONCURRENCY ?? "24", 10) || 24,
);

export const args = process.argv.slice(2);

export const dryRun = args.includes("--dry-run");

export const mandatory = args.includes("--mandatory");

export const notesArguments = args.filter((argument) => argument.startsWith("--notes"));

export const notesOverride = notesArguments[0]?.slice("--notes=".length);

export const minimumNativeArguments = args.filter((argument) =>
  argument.startsWith("--minimum-native-version"),
);

export const minimumNativeOverride = minimumNativeArguments[0]
  ?.slice("--minimum-native-version=".length)
  .trim();

export type CollectedFile = {
  bytes: Buffer;
  sha256: string;
  size: number;
};

export function collectFiles(
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

export async function uploadFilesConcurrently<T>(
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

export function contentTypeFor(filePath: string): string {
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

export function automaticNotes(now: Date): string {
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

export function assertNativeCompatibility(): string {
  const baseline = resolveNativeBaseline();
  const report = inspectNativeCompatibility(baseline);
  const declared =
    minimumNativeOverride || process.env.ASOL_OTA_MINIMUM_NATIVE_VERSION?.trim();

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

  // A declaration is a claim about a shell that already shipped. It cannot be
  // made about the shell's own compiled source, because no device carries that
  // edit — see isUndeclarableNativeChange.
  const undeclarable = undeclarableNativeChanges(report);
  const baselineNativeVersion = nativeVersionFromBaseline(baseline);
  if (
    undeclarable.length > 0 &&
    (!declared ||
      !baselineNativeVersion ||
      compareOtaVersions(declared, baselineNativeVersion) <= 0)
  ) {
    throw new Error(
      "Refusing to publish: compiled native changes require a newer shell.\n" +
        `The declared minimum native version must be strictly higher than the ${baselineNativeVersion ?? "unknown"} baseline.\n` +
        "These changes do not exist in the baseline shell:\n" +
        undeclarable.map((path) => `  - ${path}`).join("\n") +
        "\n\nBuild and test a shell carrying the higher version, publish it to the store, then re-tag the baseline:\n" +
        "  git tag native-v<version> && git push origin native-v<version>",
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
        "  npm run ota:publish -- --minimum-native-version=<x.y.z>\n" +
        "  ASOL_OTA_MINIMUM_NATIVE_VERSION=<version> npm run ota:publish\n" +
        "In the release console, fill the command's minimum native version field.",
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
