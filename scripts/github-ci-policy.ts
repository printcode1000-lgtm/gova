import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Local GitHub CI policy.
 *
 * GitHub Actions is documentation-focused. Ordinary code-only pushes should not
 * run full application CI. The docs workflow is path-filtered to documentation,
 * agent instruction surfaces, and docs/knowledge/runtime tooling.
 *
 * This module is invoked by local npm scripts and `architecture:check`. It is
 * not a general application CI job.
 */

const ROOT = process.cwd();
const DOCS_WORKFLOW = "docs.yml";

export const ALLOWED_WORKFLOW_FILES = [DOCS_WORKFLOW] as const;

const FORBIDDEN_EVENTS = [
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
  "npm run deploy",
  "npm run ota",
] as const;

const ALLOWED_DOCS_RUN_COMMANDS = new Set([
  "npm install -g npm@11",
  "npm ci --ignore-scripts",
  "npm run docs:ci",
  "npm run docs:check",
  "npm run runtime:check",
]);

const ALLOWED_DOCS_ACTIONS = new Set([
  "actions/checkout@v4",
  "actions/setup-node@v4",
]);

export const DOCS_WORKFLOW_PATH_FILTERS = [
  "docs/**",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".agents/**",
  ".cursor/rules/**",
  "scripts/docs/**",
  "scripts/architecture/**",
  "scripts/architecture-check.ts",
  "scripts/runtime/**",
  "scripts/github-ci-policy.ts",
  "package.json",
  "package-lock.json",
  ".github/workflows/docs.yml",
] as const;

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

function extractPathFilters(body: string, eventKey: "push" | "pull_request"): string[] {
  const lines = body.split(/\r?\n/);
  const onLine = lines.findIndex((line) => /^on:\s*$/.test(line));
  if (onLine < 0) return [];
  const eventLine = lines.findIndex(
    (line, index) => index > onLine && new RegExp(`^ {2}${eventKey}:\\s*$`).test(line),
  );
  if (eventLine < 0) return [];
  const pathsLine = lines.findIndex(
    (line, index) => index > eventLine && /^ {4}paths:\s*$/.test(line),
  );
  if (pathsLine < 0) return [];
  const paths: string[] = [];
  for (const line of lines.slice(pathsLine + 1)) {
    if (!/^\s/.test(line) || /^ {2}\S/.test(line) || /^ {4}\S/.test(line)) break;
    const match = /^ {6}- ["'](.+)["']\s*$/.exec(line);
    if (match) paths.push(match[1]!);
  }
  return paths;
}

function hasDocsAwareTriggers(body: string): string[] {
  const errors: string[] = [];
  if (!/^ {2}push:\s*$/m.test(body) || !/^ {4}branches:\s*$/m.test(body) || !body.includes("- main")) {
    errors.push("Docs workflow must trigger on push to main.");
  }
  if (!/^ {2}pull_request:\s*$/m.test(body)) {
    errors.push("Docs workflow must also trigger on pull_request (docs-aware path filter).");
  }
  const pushPaths = extractPathFilters(body, "push");
  const prPaths = extractPathFilters(body, "pull_request");
  for (const required of DOCS_WORKFLOW_PATH_FILTERS) {
    if (!pushPaths.includes(required)) {
      errors.push(`Docs workflow push.paths missing required filter: ${required}`);
    }
    if (!prPaths.includes(required)) {
      errors.push(`Docs workflow pull_request.paths missing required filter: ${required}`);
    }
  }
  for (const unexpected of pushPaths) {
    if (!(DOCS_WORKFLOW_PATH_FILTERS as readonly string[]).includes(unexpected)) {
      errors.push(`Docs workflow push.paths contains unexpected filter: ${unexpected}`);
    }
  }
  return errors;
}

export function docsWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*docs\s*$/m.test(body)) {
    errors.push("Docs workflow name must be exactly `docs`.");
  }
  errors.push(...hasDocsAwareTriggers(body));
  if (/\bpaths-ignore\s*:/.test(body)) {
    errors.push("Docs workflow must not use paths-ignore; use an explicit positive path filter.");
  }
  if (!/^ {2}docs:\s*$/m.test(body)) {
    errors.push("Docs workflow job id must be `docs`.");
  }
  const jobIds = docsWorkflowJobIds(body);
  if (jobIds.length !== 1 || jobIds[0] !== "docs") {
    errors.push(`Docs workflow must contain exactly one job named docs. Found: ${jobIds.join(", ") || "(none)"}.`);
  }
  if (!body.includes("npm run docs:ci")) {
    errors.push("Docs workflow must run `npm run docs:ci`.");
  }
  for (const event of FORBIDDEN_EVENTS) {
    const asKey = new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m");
    const asOnList = new RegExp(`\\bon:\\s*\\[?[^\\n]*\\b${event}\\b`);
    if (asKey.test(body) || asOnList.test(body)) {
      errors.push(`GitHub event ${event} is forbidden for the docs workflow.`);
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
    errors.push("Missing .github/workflows/docs.yml — docs-focused CI is the single allowed workflow.");
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
    console.log("GitHub CI policy passed: docs-focused path-filtered workflow; no general app CI.");
  }
}
