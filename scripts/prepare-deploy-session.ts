import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { loadReleaseEnvironment } from "./load-release-env";
import { PORTABLE_ARCHIVE_PATH } from "./secret-archive-utils";

const ROOT = process.cwd();
const SESSION_DIR = path.join(ROOT, ".deploy-session");
const SESSION_FILE = path.join(SESSION_DIR, "state.json");
const ROOT_VERCEL_LINK = path.join(ROOT, ".vercel", "project.json");
const REQUIRED_ENV_KEYS = [
  "VERCEL_TOKEN",
  "VERCEL_NOTIFICATIONS_TOKEN",
  "VERCEL_PRODUCTS_TOKEN",
  "VERCEL_ORDERS_TOKEN",
  "VERCEL_PROFILES_TOKEN",
  "VERCEL_SUBMAIN_TOKEN",
  "GITHUB_ADMIN_TOKEN",
  "TURSO_API_TOKEN",
  "TURSO_AUTH_TOKEN",
] as const;

function gitRevision(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function gitBranch(): string {
  return execFileSync("git", ["branch", "--show-current"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function missingEnvKeys(): string[] {
  return REQUIRED_ENV_KEYS.filter((key) => !process.env[key]?.trim());
}

async function main(): Promise<void> {
  loadReleaseEnvironment();

  const needsRestore = !existsSync(".env.local") || !existsSync(ROOT_VERCEL_LINK);
  if (needsRestore && existsSync(PORTABLE_ARCHIVE_PATH)) {
    if (!process.env.ASOL_SECRET_ARCHIVE_PASSWORD?.trim()) {
      console.warn(
        "[prepare-deploy-session] .env.local or .vercel/project.json is missing. " +
          "Set ASOL_SECRET_ARCHIVE_PASSWORD and run: npm run secrets:restore",
      );
    } else {
      console.log("[prepare-deploy-session] Restoring secrets from encrypted archive...");
      execFileSync("npm", ["run", "secrets:restore"], {
        cwd: ROOT,
        stdio: "inherit",
        env: process.env,
      });
      loadReleaseEnvironment();
    }
  }

  const state = {
    updatedAt: new Date().toISOString(),
    revision: gitRevision(),
    branch: gitBranch() || "detached HEAD",
    cloudAgentId: process.env.CURSOR_CONVERSATION_ID ?? null,
    hasEnvLocal: existsSync(".env.local"),
    hasVercelLink: existsSync(ROOT_VERCEL_LINK),
    missingEnvKeys: missingEnvKeys(),
    nextCommand: "npm run deploy:all",
  };

  await mkdir(SESSION_DIR, { recursive: true });
  await writeFile(SESSION_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  console.log(`[prepare-deploy-session] Wrote ${path.relative(ROOT, SESSION_FILE)}`);
  if (state.cloudAgentId) {
    console.log(
      `[prepare-deploy-session] Resume this run: https://cursor.com/agents/${state.cloudAgentId}`,
    );
  }
  if (state.missingEnvKeys.length > 0) {
    console.error(
      "[prepare-deploy-session] Missing required environment keys:",
      state.missingEnvKeys.join(", "),
    );
    process.exitCode = 1;
    return;
  }
  if (!state.hasEnvLocal || !state.hasVercelLink) {
    console.error(
      "[prepare-deploy-session] Restore secrets before deploy:all (npm run secrets:restore).",
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
