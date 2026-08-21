#!/usr/bin/env tsx
import { existsSync } from "node:fs";
import path from "node:path";

import { ACCOUNT_DECLARATIONS } from "@asol/account-declarations";
import { verifyAccountTokenAccess } from "@asol/vercel-deploy-core";

import { loadReleaseEnvironment } from "./load-release-env";

loadReleaseEnvironment();

const ROOT = process.cwd();
const ROOT_VERCEL_LINK = path.join(ROOT, ".vercel", "project.json");

async function main(): Promise<void> {
  if (!existsSync(ROOT_VERCEL_LINK)) {
    throw new Error(".vercel/project.json is required for the GitHub-linked main app.");
  }

  const missingRuntime = Object.values(ACCOUNT_DECLARATIONS)
    .flatMap((declaration) =>
      declaration.requiredEnv
        .filter((key) => !process.env[key]?.trim())
        .map((key) => `${declaration.name}: ${key}`),
    );
  if (missingRuntime.length > 0) {
    throw new Error(
      "Missing required Vercel runtime environment values:\n" +
        missingRuntime.map((entry) => `  - ${entry}`).join("\n"),
    );
  }

  const reports = [];
  for (const declaration of Object.values(ACCOUNT_DECLARATIONS)) {
    reports.push(await verifyAccountTokenAccess(declaration));
  }

  console.log("[vercel:accounts:check] Vercel account access verified:");
  console.table(
    reports.map((report) => ({
      account: report.name,
      project: report.project,
      token: report.tokenEnvVar,
      scope: report.teamId ? `team:${report.teamId}` : report.account,
    })),
  );
}

main().catch((error) => {
  console.error(
    `[vercel:accounts:check] FAILED — ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
