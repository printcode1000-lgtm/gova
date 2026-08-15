import { createHash } from "node:crypto";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CAPABILITY_METADATA_FILE,
  scanSourceCapabilityReferences,
  splitCapabilityRequirements,
} from "../release/capability-scan";
import {
  copyIfExists,
  localManifestFileName,
  prepareStaticPublicDir,
  rootDir,
  rootOutDir,
  rootPublicDir,
  STATIC_ROUTE_IGNORELIST,
  stopLiveServer,
  tempBuildDir,
  tempOutDir,
  tempSrcDir,
  writeFileWithRetry,
} from "./out-runtime-config";
import { readCurrentVersions } from "../versioning/version-reader";

export function prepareTempBuildDir(): void {
  stopLiveServer();
  rmSync(tempBuildDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
  rmSync(rootOutDir, { recursive: true, force: true });

  copyIfExists(path.join(rootDir, "src"), tempSrcDir);
  copyIfExists(
    path.join(rootDir, "packages"),
    path.join(tempBuildDir, "packages"),
  );
  for (const relativePath of STATIC_ROUTE_IGNORELIST) {
    rmSync(path.join(tempSrcDir, relativePath), {
      recursive: true,
      force: true,
    });
  }

  const rootFilesToCopy = [
    ".env",
    ".env.local",
    "next.config.ts",
    "next-env.d.ts",
    "package.json",
    "postcss.config.mjs",
    "components.json",
    "capacitor.config.ts",
    "drizzle.config.ts",
    "drizzle.profile.config.ts",
    "tsconfig.json",
  ];

  for (const fileName of rootFilesToCopy) {
    copyIfExists(
      path.join(rootDir, fileName),
      path.join(tempBuildDir, fileName),
    );
  }

  prepareStaticPublicDir();
  const capabilityRequirements = splitCapabilityRequirements(
    scanSourceCapabilityReferences(tempSrcDir),
  );
  writeFileSync(
    path.join(tempBuildDir, "public", CAPABILITY_METADATA_FILE),
    JSON.stringify(capabilityRequirements),
  );
}

export function copyBuildOutputBack(): void {
  if (!existsSync(tempOutDir)) {
    throw new Error(`Static build output not found: ${tempOutDir}`);
  }

  rmSync(rootOutDir, { recursive: true, force: true });
  cpSync(tempOutDir, rootOutDir, { recursive: true });
}

export function createStaticRscAliases(): void {
  const rscPayloads = readdirSync(rootOutDir, {
    recursive: true,
    withFileTypes: true,
  }).filter((entry) => entry.isFile() && entry.name.endsWith(".txt"));

  for (const payload of rscPayloads) {
    const sourcePath = path.join(payload.parentPath, payload.name);
    const relativeSourcePath = path.relative(rootOutDir, sourcePath);
    const marker = `${path.sep}__next.`;
    const markerIndex = relativeSourcePath.indexOf(marker);

    if (markerIndex < 0) continue;

    const routeDirectory = relativeSourcePath.slice(0, markerIndex);
    const payloadPath = relativeSourcePath.slice(markerIndex + 1);
    const flattenedPayloadName = payloadPath.split(path.sep).join(".");
    const aliasPath = path.join(
      rootOutDir,
      routeDirectory,
      flattenedPayloadName,
    );

    if (sourcePath === aliasPath) continue;

    cpSync(sourcePath, aliasPath);
  }
}

export function collectManifestFiles(
  root: string,
  current = root,
  result: Record<string, { sha256: string; size: number }> = {},
) {
  const entries = readdirSync(current, { withFileTypes: true }).sort(
    (left, right) => left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      collectManifestFiles(root, fullPath, result);
      continue;
    }

    const relativePath = path.relative(root, fullPath).replace(/\\/g, "/");
    if (relativePath === localManifestFileName) continue;
    if (relativePath.split("/").some((segment) => segment.startsWith(".")))
      continue;

    const bytes = readFileSync(fullPath);
    result[relativePath] = {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: statSync(fullPath).size,
    };
  }

  return result;
}

export async function writeLocalWebManifest(diagnostic = false): Promise<void> {
  const versionsRes = await readCurrentVersions(rootDir);
  const nativeVersion = versionsRes.ok ? versionsRes.value.nativeVersion : "0.2.4";
  const contentVersion = versionsRes.ok ? versionsRes.value.contentVersion : "0.2.4.0";

  const files = collectManifestFiles(rootOutDir);
  const size = Object.values(files).reduce(
    (total, file) => total + file.size,
    0,
  );
  const manifest = {
    schemaVersion: 2,
    delivery: "files",
    releaseId: `${process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION ?? contentVersion}-local`,
    version:
      process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION ??
      contentVersion,
    createdAt: new Date().toISOString(),
    baseUrl: "",
    size,
    fileCount: Object.keys(files).length,
    minimumNativeVersion:
      process.env.NEXT_PUBLIC_ASOL_NATIVE_VERSION ??
      nativeVersion,
    ...(() => {
      const capFile = path.join(rootOutDir, CAPABILITY_METADATA_FILE);
      if (!existsSync(capFile)) return { requiredCapabilities: [] };
      const { required, optional } = JSON.parse(
        readFileSync(capFile, "utf8"),
      ) as { required: string[]; optional: string[] };
      return optional && optional.length > 0
        ? { requiredCapabilities: required, optionalCapabilities: optional }
        : { requiredCapabilities: required };
    })(),
    mandatory: false,
    notes: "Bundled web assets",
    diagnostic,
    files,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  writeFileWithRetry(
    path.join(rootOutDir, localManifestFileName),
    manifestJson,
  );
  writeFileWithRetry(
    path.join(rootPublicDir, localManifestFileName),
    manifestJson,
  );
  console.log(
    `✅ Wrote ${localManifestFileName} (${manifest.fileCount} files, ${Math.ceil(size / 1024)} KB)`,
  );
}

export function auditCatalogStudioExcluded(): void {
  const forbiddenPaths = [
    path.join(rootOutDir, "super-admin", "catalog"),
    path.join(rootOutDir, "super-admin", "catalog.html"),
    path.join(rootOutDir, "super-admin", "google-play-store-assets"),
    path.join(rootOutDir, "super-admin", "google-play-store-assets.html"),
    path.join(rootOutDir, "super-admin", "google-play-console"),
    path.join(rootOutDir, "super-admin", "google-play-console.html"),
    path.join(rootOutDir, "super-admin", "ota-releases"),
    path.join(rootOutDir, "super-admin", "ota-releases.html"),
    path.join(rootOutDir, "api", "dev", "catalog-studio"),
  ];
  const leaked = forbiddenPaths.filter((candidate) => existsSync(candidate));
  if (leaked.length > 0) {
    throw new Error(
      `Development-only route leaked into static output: ${leaked.join(", ")}`,
    );
  }
  console.log("Development-only route exclusion audit passed.");
}

export function auditPharmacyStaticImages(): void {
  const catalogPath = path.join(
    rootDir,
    "public",
    "catagory",
    "pharmacy",
    "ingredients.json",
  );
  if (!existsSync(catalogPath)) return;
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
    schemaVersion: 3;
    items: Array<{ id: number; imagePath?: string }>;
  };
  const items = catalog.items;
  const missing = items
    .filter((item) => item.imagePath)
    .filter(
      (item) =>
        !existsSync(
          path.join(rootOutDir, String(item.imagePath).replace(/^\/+/, "")),
        ),
    );
  if (missing.length > 0) {
    throw new Error(
      `Static pharmacy image audit failed: ${missing.length} files are missing. First: ${missing[0]?.id} ${missing[0]?.imagePath}`,
    );
  }
  console.log(
    `Static pharmacy image audit passed: ${items.filter((item) => item.imagePath).length} images.`,
  );
}
