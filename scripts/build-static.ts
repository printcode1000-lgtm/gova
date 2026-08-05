import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import { CAPACITOR_API_BASE_URL, CAPACITOR_NOTIFICATIONS_BASE_URL } from "../platform/capacitor.defaults";
import { categoryService } from "../src/features/categories";
import { auditCapacitorDefaultBundle } from "./lib/capacitor-defaults-audit";
import {
  CAPABILITY_METADATA_FILE,
  scanSourceCapabilityReferences,
  splitCapabilityRequirements,
} from "./ota/ota-capability-scan";
import { MINIMUM_SUPPORTED_NATIVE_VERSION } from "../src/native-platform/capabilities/shell-capabilities";

const rootDir = process.cwd();
const tempBuildDir = path.join(rootDir, ".tmp-static-build");
const tempSrcDir = path.join(tempBuildDir, "src");
const tempOutDir = path.join(tempBuildDir, "out");
const rootOutDir = path.join(rootDir, "out");
const rootPublicDir = path.join(rootDir, "public");
const nextBinary = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

const appInitCommand = "npm run app:init";
const architectureCheckCommand = "npm run architecture:check";
const localManifestFileName = "asol-web-manifest.json";
const diagnostic = process.argv.includes("--diagnostic");

/**
 * Mirrors the precedence in `next.config.ts`. A static export ships without the
 * `app/api` routes, so an empty value makes the client fall back to its own
 * origin — `https://localhost` in the Android WebView — and every API call is
 * answered by the bundled HTML instead of the server.
 */
function resolveStaticApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ASOL_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_ASOL_API_URL?.replace(/\/$/, "") ||
    process.env.ASOL_API_BASE_URL?.replace(/\/$/, "") ||
    CAPACITOR_API_BASE_URL.replace(/\/$/, "")
  );
}

/** Fails in seconds on this machine instead of on a user's phone after release. */
function assertStaticApiBaseUrl(): void {
  const apiBaseUrl = resolveStaticApiBaseUrl();
  if (!/^https?:\/\/.+/.test(apiBaseUrl)) {
    throw new Error(
      "A static build needs an absolute API base URL, but none resolved. " +
        "Set NEXT_PUBLIC_ASOL_API_BASE_URL, or fix CAPACITOR_API_BASE_URL in platform/capacitor.defaults.ts.",
    );
  }
  console.log(`Static API base URL: ${apiBaseUrl}`);
}

/**
 * Same failure mode as the API base URL, one layer over.
 *
 * A static or native bundle has no same-origin fallback for the notifications
 * service either. Without an absolute URL the browser bridge silently delivers
 * nothing and push stops working on the phone with no error to find.
 */
function assertStaticNotificationsBaseUrl(): void {
  const notificationsBaseUrl =
    process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL?.replace(/\/$/, "") ||
    CAPACITOR_NOTIFICATIONS_BASE_URL.replace(/\/$/, "");
  if (!/^https?:\/\/.+/.test(notificationsBaseUrl)) {
    throw new Error(
      "A static build needs an absolute notifications service URL, but none resolved. " +
        "Set NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL, or fix CAPACITOR_NOTIFICATIONS_BASE_URL " +
        "in platform/capacitor.defaults.ts.",
    );
  }
  process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL = notificationsBaseUrl;
  console.log(`Static notifications base URL: ${notificationsBaseUrl}`);
}

/**
 * Verifies the resolved host actually reached the bundle. Guards against the
 * derivation changing (or silently emitting an empty value) in a future Next
 * or config refactor — the failure mode this catches shipped a broken login.
 */
function auditStaticApiBaseUrl(outDirectory: string): void {
  const chunkDirectory = path.join(outDirectory, "_next", "static", "chunks");
  if (!existsSync(chunkDirectory)) {
    throw new Error(`Static chunks are missing: ${chunkDirectory}`);
  }

  let baked = false;
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;
      const source = readFileSync(entryPath, "utf8");
      if (/apiBaseUrl:\s*""/.test(source)) {
        throw new Error(
          `Static bundle carries an empty API base URL (${path.relative(outDirectory, entryPath)}). ` +
            "Every request would target the app's own origin and return HTML.",
        );
      }
      if (/apiBaseUrl:\s*"https?:\/\//.test(source)) baked = true;
    }
  };
  walk(chunkDirectory);

  if (!baked) {
    throw new Error(
      "Could not find a baked API base URL in the static bundle. " +
        "If the build output shape changed, update auditStaticApiBaseUrl in scripts/build-static.ts.",
    );
  }
  console.log("Static API base URL audit passed.");
}

/**
 * Windows fails an open with EBUSY/EPERM/UNKNOWN while another process holds
 * the file — the dev server watches `public/`, so this write can lose a race
 * that resolves in milliseconds. Retrying beats failing a 40-minute build.
 */
function writeFileWithRetry(filePath: string, contents: string, attempts = 8): void {
  for (let attempt = 0; ; attempt += 1) {
    try {
      writeFileSync(filePath, contents);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const locked =
        code === "EBUSY" || code === "EPERM" || code === "UNKNOWN" || code === "EACCES";
      if (!locked || attempt >= attempts - 1) throw error;
      execSync(
        process.platform === "win32" ? "ping -n 2 127.0.0.1 >nul" : "sleep 0.3",
        { stdio: "ignore" },
      );
    }
  }
}

function stopLiveServer(): void {
  try {
    // Try to kill processes using the out directory
    if (process.platform === "win32") {
      try {
        execSync(
          'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Live Server*" 2>nul',
          { stdio: "ignore" },
        );
      } catch (e) {
        // Ignore if no process found
      }
      try {
        execSync(
          'taskkill /F /IM code.exe /FI "WINDOWTITLE eq Live Server*" 2>nul',
          { stdio: "ignore" },
        );
      } catch (e) {
        // Ignore if no process found
      }
    }
  } catch (error) {
    // Ignore errors when stopping Live Server
  }
}

// Public assets copied verbatim into every static build.
const STATIC_PUBLIC_ALLOW_FILES = [
  "asol-app-init.js",
  "asol-push-sw.js",
  "asol-theme-init.js",
  "logo.png",
  "images/qr-code.png",
  "catagory/categories.json",
  "catagory/subcategories.json",
] as const;

const STATIC_PUBLIC_ALLOW_DIRECTORIES = [
  "catagory/cars",
  "catagory/pharmacy",
  "images/mainCategories",
  "images/pharmacy_fixed",
  "images/subCategories",
  "product/style",
] as const;

// Source/development assets that must never enter out/, R2, Android, or iOS.
const STATIC_PUBLIC_IGNORE_FILES = [
  "catagory.db",
  "asol-web-manifest.json",
  "catagory/active_ingredient_forms.json",
  "catagory/active_ingredient_strengths.json",
  "catagory/active_ingredients.json",
  "catagory/forms.json",
  "catagory/pharmacy_categories.json",
  "catagory/pharmacy_subcategories.json",
  "catagory/product_brands.json",
  "catagory/setting.json",
  "catagory/sqlite_sequence.json",
  "catagory/strengths.json",
] as const;

const STATIC_PUBLIC_IGNORE_DIRECTORIES = ["sync_data"] as const;

// Next.js routes removed only from the temporary production/static source tree.
const STATIC_ROUTE_IGNORELIST = [
  "app/api",
  "app/dev",
  "app/orders/[orderId]",
  "app/test1",
] as const;

function copyIfExists(source: string, destination: string): void {
  if (!existsSync(source)) {
    return;
  }

  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function copyRequired(source: string, destination: string): void {
  if (!existsSync(source))
    throw new Error(`Required static asset not found: ${source}`);
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  return filePath.startsWith(`${directory}/`);
}

function listFiles(
  root: string,
  current = root,
  result: string[] = [],
): string[] {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) listFiles(root, fullPath, result);
    else result.push(normalizePath(path.relative(root, fullPath)));
  }
  return result;
}

function assertPublicAssetPolicy(): void {
  const allowFiles = new Set<string>(STATIC_PUBLIC_ALLOW_FILES);
  const ignoreFiles = new Set<string>(STATIC_PUBLIC_IGNORE_FILES);

  const unclassified = listFiles(rootPublicDir).filter((filePath) => {
    if (filePath.split("/").some((segment) => segment.startsWith(".")))
      return false;
    if (allowFiles.has(filePath)) return false;
    if (
      STATIC_PUBLIC_ALLOW_DIRECTORIES.some((directory) =>
        isInsideDirectory(filePath, directory),
      )
    )
      return false;
    if (ignoreFiles.has(filePath)) return false;
    if (
      STATIC_PUBLIC_IGNORE_DIRECTORIES.some((directory) =>
        isInsideDirectory(filePath, directory),
      )
    )
      return false;
    return true;
  });

  if (unclassified.length > 0) {
    throw new Error(
      `Unclassified public assets. Add each path to the static allowlist or ignorelist:\n${unclassified.join("\n")}`,
    );
  }
}

function prepareStaticPublicDir(): void {
  const tempPublicDir = path.join(tempBuildDir, "public");
  for (const relativePath of STATIC_PUBLIC_ALLOW_FILES) {
    copyRequired(
      path.join(rootPublicDir, relativePath),
      path.join(tempPublicDir, relativePath),
    );
  }

  for (const relativePath of STATIC_PUBLIC_ALLOW_DIRECTORIES) {
    copyRequired(
      path.join(rootPublicDir, relativePath),
      path.join(tempPublicDir, relativePath),
    );
  }

  assertPublicAssetPolicy();
}

function prepareTempBuildDir(): void {
  stopLiveServer();
  rmSync(tempBuildDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
  rmSync(rootOutDir, { recursive: true, force: true });

  copyIfExists(path.join(rootDir, "src"), tempSrcDir);
  // `next.config.ts` reads the native API host from here, so the temp build
  // needs the folder too — otherwise the config fails to resolve its import.
  copyIfExists(path.join(rootDir, "platform"), path.join(tempBuildDir, "platform"));
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

function copyBuildOutputBack(): void {
  if (!existsSync(tempOutDir)) {
    throw new Error(`Static build output not found: ${tempOutDir}`);
  }

  rmSync(rootOutDir, { recursive: true, force: true });
  cpSync(tempOutDir, rootOutDir, { recursive: true });
}

/**
 * Next's App Router may request flattened RSC URLs during client-side
 * navigation (for example `categories/45/__next.categories.$d$categoryId.txt`),
 * while the Windows static export can emit the same payload below nested
 * directories such as `categories/45/__next.categories/$d$categoryId.txt`.
 *
 * Plain static servers and Capacitor's local asset handler cannot rewrite
 * between those shapes, so create aliases beside each route.
 */
function createStaticRscAliases(): void {
  const rscPayloads = readdirSync(rootOutDir, {
    recursive: true,
    withFileTypes: true,
  }).filter((entry) => entry.isFile() && entry.name.endsWith(".txt"));

  for (const payload of rscPayloads) {
    const sourcePath = path.join(payload.parentPath, payload.name);
    const relativeSourcePath = path.relative(rootOutDir, sourcePath);
    const marker = `${path.sep}__next.`;
    const markerIndex = relativeSourcePath.indexOf(marker);

    if (markerIndex < 0) {
      continue;
    }

    const routeDirectory = relativeSourcePath.slice(0, markerIndex);
    const payloadPath = relativeSourcePath.slice(markerIndex + 1);
    const flattenedPayloadName = payloadPath.split(path.sep).join(".");
    const aliasPath = path.join(
      rootOutDir,
      routeDirectory,
      flattenedPayloadName,
    );

    if (sourcePath === aliasPath) {
      continue;
    }

    cpSync(sourcePath, aliasPath);
  }
}

function collectManifestFiles(
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

function writeLocalWebManifest(): void {
  const files = collectManifestFiles(rootOutDir);
  const size = Object.values(files).reduce(
    (total, file) => total + file.size,
    0,
  );
  const manifest = {
    schemaVersion: 2,
    delivery: "files",
    releaseId: `${process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION ?? "0.1.0"}-local`,
    version: process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION ?? "0.1.0",
    createdAt: new Date().toISOString(),
    baseUrl: "",
    size,
    fileCount: Object.keys(files).length,
    minimumNativeVersion:
      process.env.NEXT_PUBLIC_ASOL_NATIVE_VERSION ??
      MINIMUM_SUPPORTED_NATIVE_VERSION,
    ...(() => {
      const { required, optional } = JSON.parse(
        readFileSync(path.join(rootOutDir, CAPABILITY_METADATA_FILE), "utf8"),
      ) as { required: string[]; optional: string[] };
      // Mirror the manifest contract: omit an empty optional set rather than
      // writing `[]`, so the local manifest matches what gets signed.
      return optional.length > 0
        ? { requiredCapabilities: required, optionalCapabilities: optional }
        : { requiredCapabilities: required };
    })(),
    mandatory: false,
    notes: "Bundled web assets",
    diagnostic,
    files,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  writeFileWithRetry(path.join(rootOutDir, localManifestFileName), manifestJson);
  writeFileWithRetry(path.join(rootPublicDir, localManifestFileName), manifestJson);
  console.log(
    `✅ Wrote ${localManifestFileName} (${manifest.fileCount} files, ${Math.ceil(size / 1024)} KB)`,
  );
}

try {
  const childEnv = withoutVsCodeDebuggerEnv(process.env);
  execSync(appInitCommand, { stdio: "inherit", cwd: rootDir, env: childEnv });
  execSync(architectureCheckCommand, {
    stdio: "inherit",
    cwd: rootDir,
    env: childEnv,
  });

  assertStaticApiBaseUrl();
  assertStaticNotificationsBaseUrl();
  prepareTempBuildDir();

  execSync(`"${nextBinary}" build`, {
    stdio: "inherit",
    cwd: tempBuildDir,
    env: {
      ...childEnv,
      ASOL_MODE: "static",
    },
  });

  copyBuildOutputBack();
  createStaticRscAliases();
  if (diagnostic) {
    console.log("Diagnostic static build: skipped route and pharmacy audits.");
  } else {
    auditGeneratedStaticRoutes();
    auditPharmacyStaticImages();
  }
  // Always audited, diagnostic builds included: this one guards a shipping bug,
  // not a content policy.
  auditStaticApiBaseUrl(rootOutDir);
  auditCapacitorDefaultBundle(rootOutDir);
  writeLocalWebManifest();
} finally {
  rmSync(tempBuildDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}

function auditPharmacyStaticImages(): void {
  const catalogPath = path.join(
    rootDir,
    "public",
    "catagory",
    "pharmacy",
    "active_ingredients.json",
  );
  const items = JSON.parse(readFileSync(catalogPath, "utf8")) as Array<{
    id: number;
    image_url?: string;
  }>;
  const missing = items
    .filter((item) => item.image_url)
    .filter(
      (item) =>
        !existsSync(
          path.join(rootOutDir, String(item.image_url).replace(/^\/+/, "")),
        ),
    );
  if (missing.length > 0) {
    throw new Error(
      `Static pharmacy image audit failed: ${missing.length} files are missing. First: ${missing[0]?.id} ${missing[0]?.image_url}`,
    );
  }
  console.log(
    `Static pharmacy image audit passed: ${items.filter((item) => item.image_url).length} images.`,
  );
}

function auditGeneratedStaticRoutes(): void {
  console.log(
    "🔍 Auditing generated static routes against categories registry...",
  );
  const missingRoutes: string[] = [];

  // 1. Check Categories & Sellers
  const categoryIds = new Set<number>();
  for (const category of categoryService.getMainCategories()) {
    categoryIds.add(category.id);
  }
  for (const collection of categoryService.getCollections()) {
    for (const item of collection.items) {
      categoryIds.add(item.id);
    }
  }

  for (const categoryId of categoryIds) {
    const categoryPath = path.join(
      rootOutDir,
      "categories",
      String(categoryId),
      "index.html",
    );
    if (!existsSync(categoryPath)) {
      missingRoutes.push(`/categories/${categoryId}`);
    }

    // Sellers pages for this category
    const tree = categoryService.getCategoryTree(categoryId);
    if (tree) {
      for (const subcategory of tree.subcategories) {
        const sellerPath = path.join(
          rootOutDir,
          "categories",
          String(categoryId),
          "sellers",
          String(subcategory.originalId),
          "index.html",
        );
        if (!existsSync(sellerPath)) {
          missingRoutes.push(
            `/categories/${categoryId}/sellers/${subcategory.originalId}`,
          );
        }
      }
    }
  }

  // 2. Check Doctor Appointment Specialties (under Category 20)
  const medicalCategory = categoryService.getCategoryTree(20);
  if (medicalCategory && medicalCategory.doctorAppointmentItems) {
    for (const specialty of medicalCategory.doctorAppointmentItems) {
      const docPath = path.join(
        rootOutDir,
        "categories",
        "20",
        "doctor-appointment",
        String(specialty.originalId),
        "index.html",
      );
      if (!existsSync(docPath)) {
        missingRoutes.push(
          `/categories/20/doctor-appointment/${specialty.originalId}`,
        );
      }
    }
  }

  // 3. Check Collections
  for (const collection of categoryService.getCollections()) {
    const collectionPath = path.join(
      rootOutDir,
      "collections",
      String(collection.id),
      "index.html",
    );
    if (!existsSync(collectionPath)) {
      missingRoutes.push(`/collections/${collection.id}`);
    }
  }

  if (missingRoutes.length > 0) {
    console.error("\n❌ STATIC BUILD AUDIT FAILED!");
    console.error("The following expected static routes were not generated:");
    for (const route of missingRoutes) {
      console.error(`  - ${route}`);
    }
    console.error(
      "\nThis happens if page.tsx components do not generate params for these routes in generateStaticParams().",
    );
    console.error("Please check generateStaticParams() under:");
    console.error("  - src/app/categories/[categoryId]/page.tsx");
    console.error(
      "  - src/app/categories/[categoryId]/sellers/[subcategoryId]/page.tsx",
    );
    console.error(
      "  - src/app/categories/[categoryId]/doctor-appointment/[specialtyId]/page.tsx",
    );
    console.error("  - src/app/collections/[collectionId]/page.tsx\n");
    throw new Error(
      `Static build audit failed: ${missingRoutes.length} routes are missing.`,
    );
  }

  console.log(
    "✅ Static build audit passed. All registered category/sellers/doctor pages were generated successfully!",
  );
}
