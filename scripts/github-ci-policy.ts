import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Local GitHub CI policy.
 *
 * GitHub Actions must not run for ordinary project changes. The only allowed
 * workflow is docs-only, and it must be path-filtered to `docs/**`.
 *
 * This module is invoked by local npm scripts and `architecture:check`. It is
 * not a GitHub job and must never be wired to `push` for the whole tree.
 */

const ROOT = process.cwd();
const DOCS_WORKFLOW = "docs.yml";

export const ALLOWED_WORKFLOW_FILES = [DOCS_WORKFLOW] as const;

const FORBIDDEN_EVENTS = [
  "pull_request",
  "pull_request_target",
  "workflow_dispatch",
  "schedule",
  "repository_dispatch",
  "workflow_call",
  "issue_comment",
  "release",
  "merge_group",
] as const;

const FORBIDDEN_COMMANDS = [
  "npm test",
  "npm run lint",
  "npm run typecheck",
  "npm run build",
  "npm run build:static",
  "npm run architecture:check",
  "npm run services:build",
  "npm run services:sync",
  "npm run test:",
] as const;

const ALLOWED_DOCS_RUN_COMMANDS = new Set([
  "npm install -g npm@11",
  "npm ci --ignore-scripts",
  "npm run docs:check",
]);

const ALLOWED_DOCS_ACTIONS = new Set([
  "actions/checkout@v4",
  "actions/setup-node@v4",
]);

/** Extra CI configs that must not reappear. Checked locally only — never as a GitHub job. */
export const FORBIDDEN_CI_PATHS = [
  ".travis.yml",
  "azure-pipelines.yml",
  "Jenkinsfile",
  ".gitlab-ci.yml",
  "appveyor.yml",
  ".mergify.yml",
  "bitbucket-pipelines.yml",
  ".drone.yml",
  "bitrise.yml",
  "buildkite.yml",
  "werf.yaml",
  "werf.yml",
  path.join(".circleci", "config.yml"),
  ".buildkite",
  ".woodpecker",
  path.join(".github", "dependabot.yml"),
  path.join("scripts", "verify-ci-coverage.ts"),
] as const;

function listWorkflowYamlFiles(dir: string, prefix = ""): string[] {
  if (!existsSync(dir)) return [];
  const names = readdirSync(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of names) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listWorkflowYamlFiles(path.join(dir, entry.name), rel));
      continue;
    }
    if (/\.ya?ml$/i.test(entry.name)) out.push(rel);
  }
  return out.sort();
}

function stripYamlComments(source: string): string {
  return source.replace(/(^|[^:])#.*$/gm, "$1");
}

function docsWorkflowJobIds(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const jobsLine = lines.findIndex((line) => /^jobs:\s*$/.test(line));
  if (jobsLine < 0) return [];
  const ids: string[] = [];
  for (const line of lines.slice(jobsLine + 1)) {
    if (/^\S/.test(line)) break;
    const match = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (match) ids.push(match[1]!);
  }
  return ids;
}

function hasExactDocsPushTrigger(body: string): boolean {
  const lines = body.split(/\r?\n/);
  const onLine = lines.findIndex((line) => /^on:\s*$/.test(line));
  if (onLine < 0) return false;
  const block: string[] = [];
  for (const line of lines.slice(onLine)) {
    if (block.length > 0 && /^\S/.test(line)) break;
    if (line.trim()) block.push(line.trimEnd());
  }
  const expected = [
    /^on:$/,
    /^ {2}push:$/,
    /^ {4}branches:$/,
    /^ {6}- main$/,
    /^ {4}paths:$/,
    /^ {6}- ["']docs\/\*\*["']$/,
  ];
  return block.length === expected.length && block.every((line, index) => expected[index]!.test(line));
}

export function docsWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*docs\s*$/m.test(body)) {
    errors.push("Docs workflow name must be exactly `docs`.");
  }
  if (!hasExactDocsPushTrigger(body)) {
    errors.push(
      "Docs workflow trigger must be exactly push.branches=[main] and push.paths=[docs/**].",
    );
  }
  if (/\bpaths-ignore\s*:/.test(body)) {
    errors.push("Docs workflow must not use paths-ignore; only a positive docs/** path filter is allowed.");
  }
  if (!/^ {2}docs:\s*$/m.test(body)) {
    errors.push("Docs workflow job id must be `docs`.");
  }
  const jobIds = docsWorkflowJobIds(body);
  if (jobIds.length !== 1 || jobIds[0] !== "docs") {
    errors.push(`Docs workflow must contain exactly one job named docs. Found: ${jobIds.join(", ") || "(none)"}.`);
  }
  if (!body.includes("npm run docs:check")) {
    errors.push("Docs workflow must run `npm run docs:check`.");
  }
  for (const event of FORBIDDEN_EVENTS) {
    const asKey = new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m");
    const asOnList = new RegExp(`\\bon:\\s*\\[?[^\\n]*\\b${event}\\b`);
    if (asKey.test(body) || asOnList.test(body)) {
      errors.push(`GitHub event ${event} is forbidden; only path-filtered push to main is allowed.`);
    }
  }
  for (const command of FORBIDDEN_COMMANDS) {
    if (body.includes(command)) {
      errors.push(`Docs workflow must not run code CI command: ${command}`);
    }
  }
  for (const match of body.matchAll(/^\s*(?:-\s*)?run:\s*(.+?)\s*$/gm)) {
    const command = match[1]!.replace(/^['"]|['"]$/g, "");
    if (!ALLOWED_DOCS_RUN_COMMANDS.has(command)) {
      errors.push(`Docs workflow run command is not allowed: ${command}`);
    }
  }
  for (const match of body.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)\s*$/gm)) {
    const action = match[1]!.replace(/^['"]|['"]$/g, "");
    if (!ALLOWED_DOCS_ACTIONS.has(action)) {
      errors.push(`Docs workflow action is not allowed: ${action}`);
    }
  }
  return errors;
}

export function collectGithubCiPolicyErrors(root = ROOT): string[] {
  const errors: string[] = [];
  const workflowsDir = path.join(root, ".github", "workflows");
  const prTemplate = path.join(root, ".github", "pull_request_template.md");
  if (existsSync(prTemplate)) {
    errors.push("Pull request templates are forbidden; work lands on main directly.");
  }
  for (const relative of FORBIDDEN_CI_PATHS) {
    if (existsSync(path.join(root, relative))) {
      errors.push(`Forbidden CI/config path must not exist: ${relative.replace(/\\/g, "/")}`);
    }
  }
  if (!existsSync(workflowsDir)) {
    errors.push("Missing .github/workflows/docs.yml — docs-only CI is the single allowed workflow.");
    return errors;
  }
  const files = listWorkflowYamlFiles(workflowsDir);
  if (files.length !== 1 || files[0] !== DOCS_WORKFLOW) {
    errors.push(
      `Only ${DOCS_WORKFLOW} may exist under .github/workflows. Found: ${files.join(", ") || "(none)"}.`,
    );
  }
  const docsPath = path.join(workflowsDir, DOCS_WORKFLOW);
  if (existsSync(docsPath)) {
    errors.push(...docsWorkflowViolations(readFileSync(docsPath, "utf8")));
  }
  const protectPath = path.join(root, "scripts", "protect-main-branch.ts");
  if (existsSync(protectPath)) {
    const protect = readFileSync(protectPath, "utf8");
    if (!protect.includes("Applying branch protection is forbidden")) {
      errors.push("protect-main-branch.ts must refuse to apply branch protection.");
    }
    if (/REQUIRED_STATUS_CHECKS\s*=\s*\[[^\]]*'verify'/.test(protect)) {
      errors.push("protect-main-branch.ts must not require a GitHub status check.");
    }
    if (!protect.includes("/rules/branches/main") || !protect.includes("blockingMainRules")) {
      errors.push("protect-main-branch.ts must inspect all active rules that apply to main, not classic protection alone.");
    }
  }
  return errors;
}

export function verifyGithubCiPolicy(): string[] {
  return collectGithubCiPolicyErrors();
}

const executedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/github-ci-policy.ts");
if (executedDirectly) {
  const errors = verifyGithubCiPolicy();
  if (errors.length > 0) {
    console.error("GitHub CI policy failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("GitHub CI policy passed: docs-only path-filtered workflow; no general CI.");
  }
}
