import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ACCOUNT_DECLARATIONS, type AccountDeclaration } from "@asol/account-declarations";

/**
 * Repository files `/dev/cloud-accounts` reads its operational facts from.
 *
 * A command the page names is looked up in `package.json`, and a deployment's
 * Git behavior in its own `vercel.json`, so a renamed script or a re-enabled Git
 * integration shows on the page the moment the file changes — or fails here,
 * loudly, instead of the page naming a command that no longer exists.
 */

type PackageScripts = Readonly<Record<string, string>>;

function repositoryPath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

/** A workspace package's published name, read from its own manifest. */
export function workspacePackageName(directory: string): string {
  const manifest = JSON.parse(
    readFileSync(repositoryPath("packages", directory, "package.json"), "utf8"),
  ) as { name?: string };
  if (!manifest.name) {
    throw new Error(`[cloud-accounts] packages/${directory}/package.json has no name.`);
  }
  return manifest.name;
}

/** A repository-relative path, after proving the file exists. */
export function existingRepositoryFile(relativePath: string): string {
  if (!existsSync(repositoryPath(relativePath))) {
    throw new Error(`[cloud-accounts] ${relativePath} does not exist.`);
  }
  return relativePath;
}

export function readPackageScripts(): PackageScripts {
  const manifest = JSON.parse(readFileSync(repositoryPath("package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  return manifest.scripts ?? {};
}

/** `npm run <key>`, after proving the script is declared. */
export function npmCommand(scripts: PackageScripts, key: string): string {
  if (!(key in scripts)) {
    throw new Error(`[cloud-accounts] package.json declares no "${key}" script.`);
  }
  return `npm run ${key}`;
}

function scriptFileOf(command: string): string | null {
  const match = /\b(scripts\/[\w./-]+\.ts)\b/.exec(command);
  return match?.[1] ?? null;
}

function declarationConstantName(name: string): string {
  return `${name.toUpperCase().replace(/-/g, "_")}_DECLARATION`;
}

/**
 * The `*:deploy` script that deploys one declaration.
 *
 * A script matches when it passes the account name as its final argument, or
 * when its script file imports that account's declaration constant.
 */
export function deployCommandFor(
  scripts: PackageScripts,
  declaration: AccountDeclaration,
): string | null {
  const constant = declarationConstantName(declaration.name);
  for (const [key, command] of Object.entries(scripts)) {
    if (!key.endsWith(":deploy")) continue;
    if (command.trim().split(/\s+/).at(-1) === declaration.name) return `npm run ${key}`;
    const file = scriptFileOf(command);
    if (file && existsSync(repositoryPath(file))) {
      if (readFileSync(repositoryPath(file), "utf8").includes(constant)) return `npm run ${key}`;
    }
  }
  return null;
}

/** Whether the deployment's `vercel.json` lets any Git branch deploy it. */
export function gitAutoDeployFor(declaration: AccountDeclaration): boolean {
  const directory = declaration.serviceDir ?? ".";
  const file = repositoryPath(directory, "vercel.json");
  if (!existsSync(file)) return false;
  const config = JSON.parse(readFileSync(file, "utf8")) as {
    git?: { deploymentEnabled?: boolean | Record<string, boolean> };
  };
  const enabled = config.git?.deploymentEnabled;
  if (enabled === undefined) return true;
  if (typeof enabled === "boolean") return enabled;
  return Object.values(enabled).some(Boolean);
}

/** Whether Git ignores a repository path (`git check-ignore`). */
export function isGitIgnored(relativePath: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", relativePath], { cwd: process.cwd(), stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** The project of the declaration a script's file imports, or `null` when it imports none. */
export function projectReconciledBy(scripts: PackageScripts, key: string): string | null {
  const file = scriptFileOf(scripts[key] ?? "");
  if (!file || !existsSync(repositoryPath(file))) return null;
  const source = readFileSync(repositoryPath(file), "utf8");
  const declaration = (Object.values(ACCOUNT_DECLARATIONS) as AccountDeclaration[]).find(
    (candidate) => source.includes(declarationConstantName(candidate.name)),
  );
  return declaration?.project ?? null;
}

const ISOLATION_CHECK_FILE = "packages/architecture-core/src/checks/account-bridge-contract.ts";

/**
 * The name of the architecture rule that stops a service deployment importing an
 * inter-account channel, read from the check that enforces it.
 */
export function deploymentIsolationRuleName(): string {
  const source = readFileSync(repositoryPath(ISOLATION_CHECK_FILE), "utf8");
  const match = /fileRel\.startsWith\('services\/'\)[\s\S]*?addViolation\(\s*'([^']+)'/.exec(source);
  if (!match) {
    throw new Error(`[cloud-accounts] ${ISOLATION_CHECK_FILE} no longer enforces service isolation.`);
  }
  return match[1]!;
}
