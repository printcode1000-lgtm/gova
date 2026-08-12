import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { withoutVsCodeDebuggerEnv } from "../child-process-env";
import {
  CAPACITOR_API_BASE_URL,
  CAPACITOR_NOTIFICATIONS_BASE_URL,
  CAPACITOR_ORDERS_BASE_URL,
  CAPACITOR_PRODUCTS_BASE_URL,
  CAPACITOR_PROFILES_BASE_URL,
} from "../../platform/capacitor.defaults";
import { categoryService } from "../../src/features/categories";
import { auditCapacitorDefaultBundle } from "../lib/capacitor-defaults-audit";
import {
  CAPABILITY_METADATA_FILE,
  scanSourceCapabilityReferences,
  splitCapabilityRequirements,
} from "../ota/ota-capability-scan";
import {
  CURRENT_NATIVE_APP_VERSION,
  CURRENT_WEB_CONTENT_VERSION,
} from "../../src/core/config/app-version";

export const rootDir = process.cwd();

export const tempBuildDir = path.join(rootDir, ".tmp-static-build");

export const tempSrcDir = path.join(tempBuildDir, "src");

export const tempOutDir = path.join(tempBuildDir, "out");

export const rootOutDir = path.join(rootDir, "out");

export const rootPublicDir = path.join(rootDir, "public");

export const nextBinary = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

export const appInitCommand = "npm run app:init";

export const architectureCheckCommand = "npm run architecture:check";

export const localManifestFileName = "asol-web-manifest.json";

export const diagnostic = process.argv.includes("--diagnostic");

export function resolveStaticApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ASOL_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_ASOL_API_URL?.replace(/\/$/, "") ||
    process.env.ASOL_API_BASE_URL?.replace(/\/$/, "") ||
    CAPACITOR_API_BASE_URL.replace(/\/$/, "")
  );
}

export function assertStaticApiBaseUrl(): void {
  const apiBaseUrl = resolveStaticApiBaseUrl();
  if (!/^https?:\/\/.+/.test(apiBaseUrl)) {
    throw new Error(
      "A static build needs an absolute API base URL, but none resolved. " +
        "Set NEXT_PUBLIC_ASOL_API_BASE_URL, or fix CAPACITOR_API_BASE_URL in platform/capacitor.defaults.ts.",
    );
  }
  console.log(`Static API base URL: ${apiBaseUrl}`);
}

export function assertStaticNotificationsBaseUrl(): void {
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

export function assertStaticProductsBaseUrl(): void {
  const productsBaseUrl =
    process.env.NEXT_PUBLIC_ASOL_PRODUCTS_URL?.replace(/\/$/, "") ||
    CAPACITOR_PRODUCTS_BASE_URL.replace(/\/$/, "");
  if (!/^https?:\/\/.+/.test(productsBaseUrl)) {
    throw new Error(
      "A static build needs an absolute products service URL, but none resolved. " +
        "Set NEXT_PUBLIC_ASOL_PRODUCTS_URL, or fix CAPACITOR_PRODUCTS_BASE_URL " +
        "in platform/capacitor.defaults.ts.",
    );
  }
  process.env.NEXT_PUBLIC_ASOL_PRODUCTS_URL = productsBaseUrl;
  console.log(`Static products base URL: ${productsBaseUrl}`);
}

export function assertStaticOrdersBaseUrl(): void {
  const ordersBaseUrl =
    process.env.NEXT_PUBLIC_ASOL_ORDERS_URL?.replace(/\/$/, "") ||
    CAPACITOR_ORDERS_BASE_URL.replace(/\/$/, "");
  if (!/^https?:\/\/.+/.test(ordersBaseUrl)) {
    throw new Error(
      "A static build needs an absolute orders service URL, but none resolved. " +
        "Set NEXT_PUBLIC_ASOL_ORDERS_URL, or fix CAPACITOR_ORDERS_BASE_URL " +
        "in platform/capacitor.defaults.ts.",
    );
  }
  process.env.NEXT_PUBLIC_ASOL_ORDERS_URL = ordersBaseUrl;
  console.log(`Static orders base URL: ${ordersBaseUrl}`);
}

export function assertStaticProfilesBaseUrl(): void {
  const profilesBaseUrl =
    process.env.NEXT_PUBLIC_ASOL_PROFILES_URL?.replace(/\/$/, "") ||
    CAPACITOR_PROFILES_BASE_URL.replace(/\/$/, "");
  if (!/^https?:\/\/.+/.test(profilesBaseUrl)) {
    throw new Error(
      "A static build needs an absolute profiles service URL, but none resolved. " +
        "Set NEXT_PUBLIC_ASOL_PROFILES_URL, or fix CAPACITOR_PROFILES_BASE_URL " +
        "in platform/capacitor.defaults.ts.",
    );
  }
  process.env.NEXT_PUBLIC_ASOL_PROFILES_URL = profilesBaseUrl;
  console.log(`Static profiles base URL: ${profilesBaseUrl}`);
}

export function auditStaticApiBaseUrl(outDirectory: string): void {
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

export function writeFileWithRetry(
  filePath: string,
  contents: string,
  attempts = 8,
): void {
  for (let attempt = 0; ; attempt += 1) {
    try {
      writeFileSync(filePath, contents);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const locked =
        code === "EBUSY" ||
        code === "EPERM" ||
        code === "UNKNOWN" ||
        code === "EACCES";
      if (!locked || attempt >= attempts - 1) throw error;
      execSync(
        process.platform === "win32" ? "ping -n 2 127.0.0.1 >nul" : "sleep 0.3",
        { stdio: "ignore" },
      );
    }
  }
}

export function stopLiveServer(): void {
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

export const STATIC_PUBLIC_ALLOW_FILES = [
  "asol-app-init.js",
  "asol-push-sw.js",
  "asol-theme-init.js",
  "logo.png",
  "images/qr-code.png",
] as const;

export const STATIC_PUBLIC_ALLOW_DIRECTORIES = [
  "catagory",
  "images/mainCategories",
  "images/pharmacy_fixed",
  "images/subCategories",
  "product/style",
] as const;

export const STATIC_PUBLIC_IGNORE_FILES = [
  "asol-web-manifest.json",
] as const;

export const STATIC_PUBLIC_IGNORE_DIRECTORIES = ["sync_data"] as const;

export const STATIC_ROUTE_IGNORELIST = [
  "app/api",
  "app/.well-known",
  "app/dev",
  "app/super-admin/catalog",
  "app/super-admin/google-play-store-assets",
  "app/super-admin/google-play-console",
  "app/super-admin/ota-releases",
  "app/orders/[orderId]",
  "app/s",
  "app/test1",
] as const;

export function copyIfExists(source: string, destination: string): void {
  if (!existsSync(source)) {
    return;
  }

  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

export function copyRequired(source: string, destination: string): void {
  if (!existsSync(source))
    throw new Error(`Required static asset not found: ${source}`);
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

export function isInsideDirectory(filePath: string, directory: string): boolean {
  return filePath.startsWith(`${directory}/`);
}

export function listFiles(
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

export function assertPublicAssetPolicy(): void {
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

export function prepareStaticPublicDir(): void {
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
