import { execFileSync } from "child_process";
import { existsSync } from "fs";
import dotenv from "dotenv";

/**
 * Branch protection on `main` is forbidden.
 *
 * Pushes to `main` must not wait on checks, reviews, rulesets, or pull requests.
 * This script can only report status or delete a leftover protection rule.
 * Applying protection is an error.
 *
 * Credential: `GITHUB_ADMIN_TOKEN` in git-ignored `.env.local`. Nothing here
 * prints the token. `--dry-run` sends nothing.
 */

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const DRY_RUN = process.argv.includes("--dry-run");
const REMOVE = process.argv.includes("--remove");
const STATUS = process.argv.includes("--status");

function resolveRepository(): string {
  const configured = process.env.GITHUB_REPOSITORY?.trim();
  if (configured) return configured;
  const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const match = remote.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?$/);
  if (!match) throw new Error(`Could not read owner/repo from origin remote: ${remote}`);
  return match[1]!;
}

function apiHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function requireToken(): string {
  const token = process.env.GITHUB_ADMIN_TOKEN;
  if (!token) {
    console.error(
      "\nGITHUB_ADMIN_TOKEN is missing from .env.local / .env.\n" +
        "Create a fine-grained token scoped to this repository with\n" +
        '"Administration: Read and write" — see .env.example.\n' +
        "Run with --dry-run or --status after setting the token.",
    );
    process.exit(1);
  }
  return token;
}

async function readProtection(repository: string, token: string): Promise<number> {
  const verify = await fetch(`https://api.github.com/repos/${repository}/branches/main/protection`, {
    headers: apiHeaders(token),
  });
  return verify.status;
}

async function removeProtection(repository: string, token: string): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${repository}/branches/main/protection`, {
    method: "DELETE",
    headers: apiHeaders(token),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`GitHub refused the delete: ${response.status} ${await response.text()}`);
  }
  const status = await readProtection(repository, token);
  console.log(
    status === 404
      ? "Branch protection removed. Nothing restricts a push to main."
      : `WARNING: protection still reported (${status}). Check it on GitHub.`,
  );
}

async function main(): Promise<void> {
  const repository = resolveRepository();
  console.log(`Repository : ${repository}`);
  console.log("Branch     : main");

  if (!REMOVE && !STATUS) {
    console.error(
      "Applying branch protection is forbidden. Direct pushes to main must not require checks, reviews, or pull requests.\n" +
        "Use --status to read the live rule, or --remove to delete leftover protection.",
    );
    process.exit(1);
  }

  if (STATUS) {
    if (DRY_RUN) {
      console.log("\n--dry-run: would GET /branches/main/protection. Nothing sent.");
      return;
    }
    const status = await readProtection(repository, requireToken());
    console.log(
      status === 404
        ? "No branch protection on main (404). Direct push is unrestricted."
        : `WARNING: branch protection is present (${status}). Run npm run github:protect -- --remove.`,
    );
    if (status !== 404) process.exit(1);
    return;
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: would delete branch protection on main. Nothing sent.");
    return;
  }
  await removeProtection(repository, requireToken());
}

main().catch((error) => {
  console.error("Branch protection command failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
