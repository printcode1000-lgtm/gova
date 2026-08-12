import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import {
  CAPACITOR_API_BASE_URL,
  CAPACITOR_NOTIFICATIONS_BASE_URL,
  CAPACITOR_ORDERS_BASE_URL,
  CAPACITOR_PRODUCTS_BASE_URL,
  CAPACITOR_PROFILES_BASE_URL,
} from "../platform/capacitor.defaults";
import { categoryService } from "../src/features/categories";
import { auditCapacitorDefaultBundle } from "./lib/capacitor-defaults-audit";
import {
  CAPABILITY_METADATA_FILE,
  scanSourceCapabilityReferences,
  splitCapabilityRequirements,
} from "./ota/ota-capability-scan";
import {
  CURRENT_NATIVE_APP_VERSION,
  CURRENT_WEB_CONTENT_VERSION,
} from "../src/core/config/app-version";

import { rootDir, tempBuildDir, rootOutDir, nextBinary, appInitCommand, architectureCheckCommand, diagnostic, assertStaticApiBaseUrl, assertStaticNotificationsBaseUrl, assertStaticProductsBaseUrl, assertStaticOrdersBaseUrl, assertStaticProfilesBaseUrl, auditStaticApiBaseUrl } from "./build-static/build-static.runtime-config";
import { prepareTempBuildDir, copyBuildOutputBack, createStaticRscAliases, writeLocalWebManifest, auditCatalogStudioExcluded, auditPharmacyStaticImages } from "./build-static/build-static.file-operations";
import { auditGeneratedStaticRoutes } from "./build-static/build-static.public-assets";

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
  assertStaticProductsBaseUrl();
  assertStaticOrdersBaseUrl();
  assertStaticProfilesBaseUrl();
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
  auditCatalogStudioExcluded();
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
