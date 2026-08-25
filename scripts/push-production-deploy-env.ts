import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

import dotenv from "dotenv";

import { findProject, listProjectEnv, writeProjectEnv } from "@asol/vercel-deploy-core";

/**
 * Pushes what the super-admin production deploy needs onto the main Vercel project.
 *
 * Companion to `db:push:vercel-env`, kept separate because these keys belong to
 * one feature and one account: the release console at
 * `/super-admin/production-deploy`. See
 * `docs/06-super-admin-and-operations/super-admin-production-deploy.md`.
 *
 * It never invents a credential. `ASOL_DEPLOY_CALLBACK_SECRET` is the one value
 * generated here, because it is a shared secret between this project and the
 * sandbox it starts and exists nowhere else — and it is generated only when the
 * project does not already have one, so a rerun cannot orphan a running deploy.
 *
 * `VERCEL_OIDC_TOKEN` is deliberately absent: Vercel injects it per request and
 * a copied value would be a stale credential.
 */

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const PROJECT_NAME = process.env.VERCEL_PROJECT_NAME || "gova";

/** Read from the local environment; skipped with a warning when unset. */
const FROM_ENVIRONMENT = [
  {
    key: "ASOL_SECRET_ARCHIVE_PASSWORD",
    why: "lets deploy:all restore its own secrets inside the sandbox",
    required: true,
  },
  {
    key: "ASOL_DEPLOY_NOTIFICATION_EMAIL",
    why: "recipient of the deploy result email",
    required: true,
  },
  {
    key: "PASSWORD_RECOVERY_GMAIL_USER",
    why: "SMTP sender for the deploy result email",
    required: true,
  },
  {
    key: "PASSWORD_RECOVERY_GMAIL_APP_PASSWORD",
    why: "SMTP sender for the deploy result email",
    required: true,
  },
  {
    key: "ASOL_DEPLOY_REPOSITORY_TOKEN",
    why: "clone access; only needed while the repository is private",
    required: false,
    fallbackKey: "GITHUB_ADMIN_TOKEN",
  },
] as const;

function repositoryUrl(): string {
  const explicit = process.env.ASOL_DEPLOY_REPOSITORY_URL?.trim();
  if (explicit) return explicit;
  const origin = execFileSync("git", ["remote", "get-url", "origin"], {
    encoding: "utf8",
  }).trim();
  const match = /github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(origin);
  if (!match) throw new Error(`Could not read a GitHub slug from origin: ${origin}`);
  return `https://github.com/${match[1]}.git`;
}

function requireToken(): string {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_ACCESS_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN or VERCEL_ACCESS_TOKEN is required in .env.local");
  return token;
}

async function main(): Promise<void> {
  const token = requireToken();
  const teamId = process.env.VERCEL_ORG_ID || process.env.VERCEL_TEAM_ID || undefined;
  const projectId = await findProject(token, PROJECT_NAME, teamId);
  if (!projectId) throw new Error(`Vercel project "${PROJECT_NAME}" not found.`);
  const existing = await listProjectEnv(token, projectId, teamId);
  console.log(`Vercel project: ${PROJECT_NAME} (${projectId})`);

  const missing: string[] = [];
  const write = async (key: string, value: string, note = "") => {
    const result = await writeProjectEnv(token, projectId, key, value, existing, teamId);
    console.log(`✅ ${key}: ${result}${note ? ` (${note})` : ""}`);
  };

  for (const entry of FROM_ENVIRONMENT) {
    const value =
      process.env[entry.key]?.trim() ||
      ("fallbackKey" in entry ? process.env[entry.fallbackKey]?.trim() : "") ||
      "";
    if (!value) {
      console.warn(`⚠️  ${entry.key}: no local value — skipped (${entry.why}).`);
      if (entry.required) missing.push(entry.key);
      continue;
    }
    await write(
      entry.key,
      value,
      "fallbackKey" in entry && !process.env[entry.key]?.trim()
        ? `from ${entry.fallbackKey}`
        : "",
    );
  }

  await write("ASOL_DEPLOY_REPOSITORY_URL", repositoryUrl());

  if (existing.some((item) => item.key === "ASOL_DEPLOY_CALLBACK_SECRET")) {
    console.log("↩️  ASOL_DEPLOY_CALLBACK_SECRET: kept (already set on the project)");
  } else {
    await write("ASOL_DEPLOY_CALLBACK_SECRET", randomBytes(32).toString("hex"), "generated");
  }

  console.log(
    missing.length > 0
      ? `\n⚠️  Still missing on the project: ${missing.join(", ")}. ` +
          "Add the value to .env.local and run this again; the console lists what is missing too."
      : "\n🎉 Production deploy environment is complete. Redeploy gova for the values to take effect.",
  );
  console.log(
    "   VERCEL_OIDC_TOKEN is injected by Vercel — enable OIDC for the project instead of setting it.",
  );
}

main().catch((error) => {
  console.error("❌ Failed to sync production deploy env:", error instanceof Error ? error.message : error);
  process.exit(1);
});
