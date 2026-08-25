import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { loadOtaEnvironment } from "../config/ota-config";
import { ok, err, type Result } from "../../errors/result";
import { OtaCoreError } from "../../errors/ota-core-error";
import {
  appInitCommand,
  architectureCheckCommand,
  assertStaticApiBaseUrl,
  assertStaticNotificationsBaseUrl,
  assertStaticOrdersBaseUrl,
  assertStaticProductsBaseUrl,
  assertStaticProfilesBaseUrl,
  assertStaticSubmainBaseUrl,
  assertStaticSub2mainBaseUrl,
  assertStaticMobilePushCredentialBlob,
  auditStaticApiBaseUrl,
  auditStaticMobilePushSecurity,
  nextBinary,
  rootDir,
  rootOutDir,
  tempBuildDir,
  localManifestFileName,
} from "./out-runtime-config";
import {
  auditCatalogStudioExcluded,
  auditPharmacyStaticImages,
  copyBuildOutputBack,
  createStaticRscAliases,
  prepareTempBuildDir,
  writeLocalWebManifest,
} from "./out-file-operations";
import { auditGeneratedStaticRoutes } from "./out-public-assets";

export interface BuildStaticOutOptions {
  diagnostic?: boolean;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  skipAudit?: boolean;
  root?: string;
}

export interface BuildStaticOutResult {
  outDir: string;
  fileCount: number;
  totalBytes: number;
  manifestPath: string;
}

function withoutVsCodeDebuggerEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...source };
  delete env.VSCODE_INSPECTOR_OPTIONS;
  delete env.NODE_INSPECT_RESUME_ON_START;
  delete env.NODE_OPTIONS;
  return env;
}

function auditCapacitorDefaultBundle(
  outputDirectory = path.resolve("out"),
): void {
  const indexPath = path.join(outputDirectory, "index.html");
  const initPath = path.join(outputDirectory, "asol-app-init.js");
  if (!existsSync(indexPath) || !existsSync(initPath)) {
    throw new Error(
      "Capacitor defaults audit requires out/index.html and out/asol-app-init.js.",
    );
  }

  const index = readFileSync(indexPath, "utf8");
  const init = readFileSync(initPath, "utf8");
  const errors: string[] = [];

  if (!/<html[^>]*lang="ar"/.test(index)) {
    errors.push("index.html does not start with Arabic locale.");
  }
  if (!/<html[^>]*dir="rtl"/.test(index)) {
    errors.push("index.html does not start in RTL.");
  }
  if (!/<html[^>]*data-theme="light"/.test(index)) {
    errors.push("index.html does not start with the light theme.");
  }
  if (/<html[^>]*data-theme="dark"/.test(index)) {
    errors.push("index.html contains a dark initial theme.");
  }
  for (const required of [
    "setAttribute('data-theme','light')",
    "setAttribute('data-theme-mode','light')",
    "setAttribute('data-density','comfortable')",
    "setAttribute('data-high-contrast','false')",
  ]) {
    if (!init.includes(required)) {
      errors.push(`asol-app-init.js is missing ${required}.`);
    }
  }

  const PROHIBITED_FILE_NAMES = [
    ".env",
    ".env.local",
    "google-services.json",
    "firebase-admin.json",
  ];
  const PROHIBITED_EXTENSIONS = [".db", ".sqlite", ".sqlite3"];
  const PROHIBITED_DIRECTORIES = ["sync_data"];

  const listAllFiles = (dir: string, cur = dir, res: string[] = []) => {
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) listAllFiles(dir, full, res);
      else res.push(path.relative(dir, full).replace(/\\/g, "/"));
    }
    return res;
  };

  for (const relativePath of listAllFiles(outputDirectory)) {
    const segments = relativePath.toLowerCase().split("/");
    const fileName = segments.at(-1) ?? "";
    const extension = path.extname(fileName);
    if (PROHIBITED_FILE_NAMES.includes(fileName)) {
      errors.push(`private configuration entered the bundle: ${relativePath}`);
    }
    if (PROHIBITED_EXTENSIONS.includes(extension)) {
      errors.push(`database file entered the bundle: ${relativePath}`);
    }
    if (segments.some((segment) => PROHIBITED_DIRECTORIES.includes(segment))) {
      errors.push(`runtime data directory entered the bundle: ${relativePath}`);
    }
  }

  if (statSync(indexPath).size === 0 || statSync(initPath).size === 0) {
    errors.push("Capacitor initialization assets must not be empty.");
  }

  if (errors.length > 0) {
    throw new Error(
      `Capacitor default-state audit failed:\n${errors
        .map((error) => `- ${error}`)
        .join("\n")}`,
    );
  }

  console.log(
    "Capacitor defaults audit passed: fresh install is light, Arabic, RTL, logged out, and free of persisted data files.",
  );
}

export async function buildStaticOut(
  options: BuildStaticOutOptions = {},
): Promise<Result<BuildStaticOutResult, OtaCoreError>> {
  const root = options.root ?? rootDir;
  try {
    loadOtaEnvironment();
    const childEnv = {
      ...withoutVsCodeDebuggerEnv(process.env),
      ...(options.env ?? {}),
    };

    execSync(appInitCommand, { stdio: "inherit", cwd: root, env: childEnv });
    execSync(architectureCheckCommand, {
      stdio: "inherit",
      cwd: root,
      env: childEnv,
    });

    assertStaticApiBaseUrl();
    assertStaticNotificationsBaseUrl();
    assertStaticProductsBaseUrl();
    assertStaticOrdersBaseUrl();
    assertStaticProfilesBaseUrl();
    assertStaticSubmainBaseUrl();
    assertStaticSub2mainBaseUrl();
    assertStaticMobilePushCredentialBlob();
    prepareTempBuildDir();

    try {
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

      if (options.diagnostic) {
        console.log("Diagnostic static build: skipped route and pharmacy audits.");
      } else if (!options.skipAudit) {
        auditGeneratedStaticRoutes();
        auditPharmacyStaticImages();
      }

      auditStaticApiBaseUrl(rootOutDir);
      auditStaticMobilePushSecurity(rootOutDir);
      auditCatalogStudioExcluded();
      auditCapacitorDefaultBundle(rootOutDir);
      await writeLocalWebManifest(options.diagnostic ?? false);

      const manifestPath = path.join(rootOutDir, localManifestFileName);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        fileCount: number;
        size: number;
      };

      return ok({
        outDir: rootOutDir,
        fileCount: manifest.fileCount,
        totalBytes: manifest.size,
        manifestPath,
      });
    } finally {
      rmSync(tempBuildDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      });
    }
  } catch (error) {
    return err(
      OtaCoreError.buildFailed("Static out build pipeline failed", error),
    );
  }
}
