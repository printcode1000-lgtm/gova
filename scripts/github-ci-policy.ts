import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { CONTROL_PLANE_BRANCH_NAMESPACES } from "@asol/local-agent-core";
/**
 * Local GitHub CI policy.
 *
 * GitHub Actions has two narrow jobs: documentation validation and an OIDC-only
 * production deploy dispatcher. Application correctness remains local.
 *
 * This module is invoked by local npm scripts and `architecture:check`. It is
 * not a general application CI job.
 */

const ROOT = process.cwd();
const DOCS_WORKFLOW = "docs.yml";
const DEPLOY_WORKFLOW = "deploy-main.yml";
const LOCAL_AGENT_WORKFLOW = "local-agent-main.yml";
const LOCAL_AGENT_INSPECT_WORKFLOW = "local-agent-inspect.yml";
const LOCAL_AGENT_WORKSPACE_WORKFLOW = "local-agent-workspace.yml";
const LOCAL_AGENT_STATUS_WORKFLOW = "local-agent-status.yml";
const LOCAL_AGENT_COORDINATION_WORKFLOW = "local-agent-coordination.yml";
const LOCAL_AGENT_GATEWAY_WORKFLOW = "local-agent-gateway.yml";
const LOCAL_WORKSPACE_ENV = "GOVA_LOCAL_WORKSPACE: /home/hesham/gova";
const COORDINATION_ENV = "GOVA_AGENT_COORDINATION_DIR: /home/hesham/gova/.local/github-runners/gova-coordination";
const LOCAL_WORKING_DIRECTORY = "working-directory: /home/hesham/gova";

/**
 * Control-plane paths that must never trigger a production deployment. A
 * coordination change alters how agents work on this machine; it does not
 * change what production serves.
 */
export const DEPLOY_CONTROL_PLANE_IGNORES = [
  ".agent-control/**",
  ".github/workflows/local-agent-*.yml",
  "packages/local-agent-core/**",
  "scripts/local-agent-*.ts",
  "docs/**",
  "note/**",
  ".agents/**",
  ".vscode/**",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "README.md",
] as const;
const SELF_HOSTED_RUNNER = "runs-on: [self-hosted, Linux, X64, gova]";
const GITHUB_HOSTED_RUNNER = "runs-on: ubuntu-latest";
const RUNNER_SELECTOR_API = "listSelfHostedRunnersForRepo";
const RUNNER_STATUS_SECRET = "secrets.GOVA_RUNNER_STATUS_TOKEN";

export const ALLOWED_WORKFLOW_FILES = [
  DEPLOY_WORKFLOW,
  DOCS_WORKFLOW,
  LOCAL_AGENT_COORDINATION_WORKFLOW,
  LOCAL_AGENT_GATEWAY_WORKFLOW,
  LOCAL_AGENT_INSPECT_WORKFLOW,
  LOCAL_AGENT_WORKFLOW,
  LOCAL_AGENT_STATUS_WORKFLOW,
  LOCAL_AGENT_WORKSPACE_WORKFLOW,
] as const;

const FORBIDDEN_EVENTS = [
  "pull_request_target",
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

/**
 * The `run:` values of a workflow, split by YAML form.
 *
 * A single-line `run: npx tsx …` names one command, and the allowlists below are
 * written in those terms. A block scalar — `run: |` followed by an indented
 * script — is not a command at all; matching it with the same expression yields
 * the literal `|`, which is in no allowlist and reported as a forbidden command.
 * That is why every local agent workflow failed this policy: the three shell
 * blocks they legitimately carry were each read as a command named `|`.
 *
 * So the two forms are separated and judged on their own terms: an inline
 * command must be on the allowlist, while a block is a shell script and is held
 * to the forbidden-command list instead.
 */
export function runValues(body: string): { inline: string[]; blocks: string[] } {
  const lines = body.split(/\r?\n/);
  const inline: string[] = [];
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)(?:-\s*)?run:[ \t]*(.*)$/.exec(lines[index]!);
    if (!match) continue;
    const value = match[2]!.trim();
    if (!/^[|>][+-]?$/.test(value)) {
      if (value) inline.push(value.replace(/^['"]|['"]$/g, ""));
      continue;
    }
    // A block scalar owns every following line indented deeper than the key.
    const keyIndent = match[1]!.length;
    const collected: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor]!;
      if (line.trim() === "") {
        collected.push("");
        continue;
      }
      const indent = line.length - line.trimStart().length;
      if (indent <= keyIndent) break;
      collected.push(line.trim());
    }
    blocks.push(collected.join("\n"));
  }
  return { inline, blocks };
}

/**
 * Judge a workflow's `run:` values: inline commands against the allowlist, shell
 * blocks against the commands no local agent workflow may ever invoke.
 */
function runCommandViolations(body: string, allowed: ReadonlySet<string>, label: string): string[] {
  const errors: string[] = [];
  const { inline, blocks } = runValues(body);
  for (const command of inline) {
    if (!allowed.has(command)) errors.push(`${label} run command is not allowed: ${command}`);
  }
  for (const block of blocks) {
    for (const forbidden of FORBIDDEN_COMMANDS) {
      if (block.includes(forbidden)) {
        errors.push(`${label} shell block must not run ${forbidden}.`);
      }
    }
  }
  return errors;
}

const ALLOWED_DOCS_RUN_COMMANDS = new Set([
  "npm install -g npm@11",
  "npm ci --ignore-scripts",
  "npm run docs:generate",
  "npm run docs:ci",
  "npm run docs:check",
  "npm run docs:diff -- --against-head",
  "npm run runtime:check",
]);

const ALLOWED_DOCS_ACTIONS = new Set([
  "actions/checkout@v4",
  "actions/github-script@v7",
  "actions/setup-node@v4",
]);

/**
 * Local agent jobs execute one script against the already-installed workspace.
 * Checkout, Node setup, and dependency installation are deliberately absent:
 * `/home/hesham/gova` is the real workspace, so re-materialising it per job is
 * pure latency.
 */
const ALLOWED_LOCAL_AGENT_RUN_COMMANDS = new Set(["npx tsx scripts/local-agent-main-apply.ts"]);
const ALLOWED_LOCAL_AGENT_STATUS_RUN_COMMANDS = new Set(["npx tsx scripts/local-agent-status.ts"]);
const ALLOWED_LOCAL_AGENT_INSPECT_RUN_COMMANDS = new Set(["npx tsx scripts/local-agent-inspect.ts"]);
const ALLOWED_LOCAL_AGENT_COORDINATION_RUN_COMMANDS = new Set(["npx tsx scripts/local-agent-coordination.ts"]);
const ALLOWED_LOCAL_AGENT_GATEWAY_RUN_COMMANDS = new Set(["npx tsx scripts/local-agent-gateway.ts"]);

export const DOCS_WORKFLOW_PATH_FILTERS = [
  "docs/**",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".agents/**",
  "scripts/docs/**",
  "scripts/architecture/**",
  "scripts/architecture-check.ts",
  "scripts/runtime/**",
  "scripts/github-ci-policy.ts",
  "packages/local-agent-core/**",
  "scripts/local-agent-*.ts",
  "package.json",
  "package-lock.json",
  ".github/workflows/docs.yml",
  ".github/workflows/local-agent-coordination.yml",
  ".github/workflows/local-agent-gateway.yml",
  ".github/workflows/local-agent-inspect.yml",
  ".github/workflows/local-agent-main.yml",
  ".github/workflows/local-agent-workspace.yml",
  ".github/workflows/local-agent-status.yml",
] as const;

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
    if (!pushPaths.includes(required)) errors.push(`Docs workflow push.paths missing required filter: ${required}`);
    if (!prPaths.includes(required)) errors.push(`Docs workflow pull_request.paths missing required filter: ${required}`);
  }
  for (const unexpected of pushPaths) {
    if (!(DOCS_WORKFLOW_PATH_FILTERS as readonly string[]).includes(unexpected)) {
      errors.push(`Docs workflow push.paths contains unexpected filter: ${unexpected}`);
    }
  }
  for (const unexpected of prPaths) {
    if (!(DOCS_WORKFLOW_PATH_FILTERS as readonly string[]).includes(unexpected)) {
      errors.push(`Docs workflow pull_request.paths contains unexpected filter: ${unexpected}`);
    }
  }
  return errors;
}

export function docsWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*docs\s*$/m.test(body)) errors.push("Docs workflow name must be exactly `docs`.");
  if (!body.includes(SELF_HOSTED_RUNNER)) errors.push("Docs workflow must prefer the gova self-hosted runner.");
  if (!body.includes(GITHUB_HOSTED_RUNNER)) errors.push("Docs workflow must keep GitHub-hosted fallback.");
  if (!body.includes(RUNNER_SELECTOR_API)) errors.push("Docs workflow must verify local runner availability before fallback.");
  if (!body.includes(RUNNER_STATUS_SECRET)) {
    errors.push("Docs workflow must use the runner status token only for fallback selection.");
  }
  errors.push(...hasDocsAwareTriggers(body));
  if (/\bpaths-ignore\s*:/.test(body)) errors.push("Docs workflow must not use paths-ignore; use an explicit positive path filter.");
  const jobIds = docsWorkflowJobIds(body);
  const expectedJobIds = ["select-runner", "docs-local", "docs-github-hosted"];
  if (jobIds.length !== expectedJobIds.length || expectedJobIds.some((job, index) => jobIds[index] !== job)) {
    errors.push(
      `Docs workflow must contain exactly these jobs: ${expectedJobIds.join(", ")}. Found: ${jobIds.join(", ") || "(none)"}.`,
    );
  }
  for (const requiredCommand of [
    "npm run docs:generate",
    "npm run docs:ci",
    "npm run docs:diff -- --against-head",
    "npm run runtime:check",
  ]) {
    if (!body.includes(requiredCommand)) errors.push(`Docs workflow must run \`${requiredCommand}\`.`);
  }
  if (!/fetch-depth:\s*0\b/.test(body)) {
    errors.push("Docs workflow checkout must use fetch-depth: 0 so protected-doc diffs cannot disappear in a shallow checkout.");
  }
  if (
    !body.includes("DOCS_CI_BASE_REF:") ||
    !body.includes("github.event.pull_request.base.sha") ||
    !body.includes("github.event.before")
  ) {
    errors.push("Docs workflow must provide DOCS_CI_BASE_REF from the pull-request base SHA or push before SHA.");
  }
  for (const event of FORBIDDEN_EVENTS) {
    const asKey = new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m");
    const asOnList = new RegExp(`\\bon:\\s*\\[?[^\\n]*\\b${event}\\b`);
    if (asKey.test(body) || asOnList.test(body)) errors.push(`GitHub event ${event} is forbidden for the docs workflow.`);
  }
  if (/(^|\n)\s*workflow_dispatch\s*:/m.test(body)) {
    errors.push("GitHub event workflow_dispatch is forbidden for the docs workflow.");
  }
  for (const command of FORBIDDEN_COMMANDS) {
    if (body.includes(command)) errors.push(`Docs workflow must not run code CI command: ${command}`);
  }
  for (const match of body.matchAll(/^\s*(?:-\s*)?run:[ \t]+(.+?)[ \t]*$/gm)) {
    const command = match[1]!.replace(/^['"]|['"]$/g, "");
    if (!ALLOWED_DOCS_RUN_COMMANDS.has(command)) errors.push(`Docs workflow run command is not allowed: ${command}`);
  }
  for (const match of body.matchAll(/^\s*(?:-\s*)?uses:[ \t]+(\S+)[ \t]*$/gm)) {
    const action = match[1]!.replace(/^['"]|['"]$/g, "");
    if (!ALLOWED_DOCS_ACTIONS.has(action)) errors.push(`Docs workflow action is not allowed: ${action}`);
  }
  return errors;
}

export function deploymentWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*deploy-main\s*$/m.test(body)) errors.push("Deployment workflow name must be exactly `deploy-main`.");
  if (!body.includes(SELF_HOSTED_RUNNER)) errors.push("Deployment workflow must prefer the gova self-hosted runner.");
  if (!body.includes(GITHUB_HOSTED_RUNNER)) errors.push("Deployment workflow must keep GitHub-hosted fallback.");
  if (!body.includes(RUNNER_SELECTOR_API)) {
    errors.push("Deployment workflow must verify local runner availability before fallback.");
  }
  if (!body.includes(RUNNER_STATUS_SECRET)) {
    errors.push("Deployment workflow must use the runner status token only for fallback selection.");
  }
  if (!/^ {2}push:\s*$/m.test(body) || !/^ {4}branches:\s*$/m.test(body) || !/^ {6}- main\s*$/m.test(body)) {
    errors.push("Deployment workflow must trigger only on push to main.");
  }
  for (const ignored of DEPLOY_CONTROL_PLANE_IGNORES) {
    if (!body.includes(`- "${ignored}"`)) {
      errors.push(`Deployment workflow must not deploy control-plane changes; missing paths-ignore entry: ${ignored}`);
    }
  }
  for (const event of [...FORBIDDEN_EVENTS, "pull_request"] as const) {
    if (new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m").test(body)) {
      errors.push(`GitHub event ${event} is forbidden for the deployment workflow.`);
    }
  }
  if (/(^|\n)\s*workflow_dispatch\s*:/m.test(body)) {
    errors.push("GitHub event workflow_dispatch is forbidden for the deployment workflow.");
  }
  for (const required of [
    "id-token: write",
    "contents: read",
    "group: asol-production-main",
    "cancel-in-progress: false",
    "actions/github-script@v7",
    "asol-production-deploy",
    "/api/super-admin/production-deploy/github",
    "github.sha",
    "status === 'succeeded'",
    "status === 'failed'",
  ]) {
    if (!body.includes(required)) errors.push(`Deployment workflow is missing required contract: ${required}`);
  }
  if (/^\s*(?:-\s*)?run:/m.test(body)) errors.push("Deployment workflow must not execute shell commands.");
  if (/actions\/checkout@/i.test(body)) errors.push("Deployment workflow must not check out repository source.");
  const secretMatches = [...body.matchAll(/\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/g)].map((match) => match[1]);
  for (const secret of secretMatches) {
    if (secret !== "GOVA_RUNNER_STATUS_TOKEN") {
      errors.push(`Deployment workflow must not consume GitHub secret: ${secret}.`);
    }
  }
  const actions = [...body.matchAll(/^\s*(?:-\s*)?uses:[ \t]+(\S+)[ \t]*$/gm)].map((match) => match[1]!.replace(/['"]/g, ""));
  if (actions.length !== 3 || actions.some((action) => action !== "actions/github-script@v7")) {
    errors.push(`Deployment workflow must use only three actions/github-script@v7 steps. Found: ${actions.join(", ") || "(none)"}.`);
  }
  const jobIds = docsWorkflowJobIds(body);
  const expectedJobIds = ["select-runner", "deploy-local", "deploy-github-hosted"];
  if (jobIds.length !== expectedJobIds.length || expectedJobIds.some((job, index) => jobIds[index] !== job)) {
    errors.push(
      `Deployment workflow must contain exactly these jobs: ${expectedJobIds.join(", ")}. Found: ${jobIds.join(", ") || "(none)"}.`,
    );
  }
  return errors;
}

/**
 * Shared requirements for every job that runs on the local pool: it must work
 * in `/home/hesham/gova`, reach the coordination channel there, and never
 * re-materialise the workspace it already has.
 */
function localWorkspaceViolations(body: string, label: string): string[] {
  const errors: string[] = [];
  if (!body.includes(LOCAL_WORKING_DIRECTORY)) {
    errors.push(`${label} must run in /home/hesham/gova, the real workspace.`);
  }
  if (!body.includes(LOCAL_WORKSPACE_ENV)) {
    errors.push(`${label} must export GOVA_LOCAL_WORKSPACE=/home/hesham/gova.`);
  }
  if (!body.includes(COORDINATION_ENV) && label !== "Local agent status workflow") {
    errors.push(`${label} must expose the coordination channel under the workspace .local root.`);
  }
  if (/github-runners\/gova-coordination/.test(body) && !body.includes(COORDINATION_ENV)) {
    errors.push(`${label} references a coordination directory outside the workspace .local root.`);
  }
  if (/actions\/checkout@/i.test(body)) {
    errors.push(`${label} must not check out the repository; /home/hesham/gova is already the workspace.`);
  }
  if (/actions\/setup-node@/i.test(body)) {
    errors.push(`${label} must not install a Node toolchain; the runner host already has one.`);
  }
  if (/npm ci/.test(body)) {
    errors.push(`${label} must not run npm ci; the workspace dependencies are already installed.`);
  }
  return errors;
}

export function localAgentWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*local-agent-(main|workspace)\s*$/m.test(body)) {
    errors.push("Local agent workflow name must be exactly `local-agent-main` or `local-agent-workspace`.");
  }
  if (!/^ {2}workflow_dispatch:\s*$/m.test(body)) errors.push("Local agent workflow must be manually dispatched.");
  if (!body.includes("patch_base64:")) errors.push("Local agent workflow must require patch_base64 input.");
  if (!body.includes("commit_message:")) errors.push("Local agent workflow must require commit_message input.");
  if (!body.includes("permissions:") || !body.includes("contents: write")) {
    errors.push("Local agent workflow must have contents: write for direct main pushes.");
  }
  if (!body.includes(SELF_HOSTED_RUNNER)) {
    errors.push("Local agent workflow must run only on the gova self-hosted runner.");
  }
  if (body.includes(GITHUB_HOSTED_RUNNER)) {
    errors.push("Local agent workflow must not fall back to GitHub-hosted execution.");
  }
  errors.push(...localWorkspaceViolations(body, "Local agent workflow"));
  if (!body.includes("npx tsx scripts/local-agent-main-apply.ts")) {
    errors.push("Local agent workflow must delegate edits to scripts/local-agent-main-apply.ts.");
  }
  if (!body.includes("shell_command:") || !body.includes("patch_base64:")) {
    errors.push("Local agent workflow must accept both patch_base64 and shell_command so a shell-only job needs no fake patch.");
  }
  if (/^\s+patch_base64:[\s\S]{0,200}?required: true/m.test(body)) {
    errors.push("Local agent workflow must not require patch_base64; shell-only jobs are valid.");
  }
  if (body.includes("${{ secrets.")) errors.push("Local agent workflow must not consume GitHub secrets.");
  errors.push(...runCommandViolations(body, ALLOWED_LOCAL_AGENT_RUN_COMMANDS, "Local agent workflow"));
  const jobIds = docsWorkflowJobIds(body);
  const allowedJobIds = ["apply-and-push", "apply-and-push-branch"];
  if (jobIds.length !== 1 || !allowedJobIds.includes(jobIds[0]!)) {
    errors.push(`Local agent workflow must contain exactly one approved apply job. Found: ${jobIds.join(", ") || "(none)"}.`);
  }
  for (const event of [...FORBIDDEN_EVENTS, "push", "pull_request"] as const) {
    if (new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m").test(body)) {
      errors.push(`GitHub event ${event} is forbidden for the local agent workflow.`);
    }
  }
  return errors;
}

export function localAgentStatusWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*local-agent-status\s*$/m.test(body)) {
    errors.push("Local agent status workflow name must be exactly `local-agent-status`.");
  }
  if (!/^ {2}workflow_dispatch:\s*$/m.test(body)) errors.push("Local agent status workflow must be manually dispatched.");
  if (!body.includes("paths:")) errors.push("Local agent status workflow must accept paths input.");
  if (!body.includes("permissions:") || !body.includes("actions: read") || !body.includes("contents: read")) {
    errors.push("Local agent status workflow must be read-only.");
  }
  if (body.includes("contents: write")) errors.push("Local agent status workflow must not push.");
  if (!body.includes(SELF_HOSTED_RUNNER)) errors.push("Local agent status workflow must run only on the gova self-hosted runner.");
  if (body.includes(GITHUB_HOSTED_RUNNER)) errors.push("Local agent status workflow must not fall back to GitHub-hosted execution.");
  if (!body.includes("GOVA_RUNNER_STATUS_TOKEN: ${{ secrets.GOVA_RUNNER_STATUS_TOKEN }}")) {
    errors.push("Local agent status workflow must use the runner status token for GitHub state reads.");
  }
  errors.push(...localWorkspaceViolations(body, "Local agent status workflow"));
  if (!body.includes("npx tsx scripts/local-agent-status.ts")) {
    errors.push("Local agent status workflow must delegate reads to scripts/local-agent-status.ts.");
  }
  errors.push(...runCommandViolations(body, ALLOWED_LOCAL_AGENT_STATUS_RUN_COMMANDS, "Local agent status workflow"));
  const jobIds = docsWorkflowJobIds(body);
  if (jobIds.length !== 1 || jobIds[0] !== "local-status") {
    errors.push(`Local agent status workflow must contain exactly one job named local-status. Found: ${jobIds.join(", ") || "(none)"}.`);
  }
  for (const event of [...FORBIDDEN_EVENTS, "push", "pull_request"] as const) {
    if (new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m").test(body)) {
      errors.push(`GitHub event ${event} is forbidden for the local agent status workflow.`);
    }
  }
  return errors;
}

export function localAgentInspectWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*local-agent-inspect\s*$/m.test(body)) {
    errors.push("Local agent inspect workflow name must be exactly `local-agent-inspect`.");
  }
  if (!/^ {2}workflow_dispatch:\s*$/m.test(body)) errors.push("Local agent inspect workflow must be manually dispatched.");
  for (const input of ["agent_id:", "mode:", "paths:", "pattern:"]) {
    if (!body.includes(input)) errors.push(`Local agent inspect workflow must accept ${input} input.`);
  }
  if (!body.includes("permissions:") || !body.includes("contents: read")) {
    errors.push("Local agent inspect workflow must be read-only.");
  }
  if (body.includes("contents: write")) errors.push("Local agent inspect workflow must not push.");
  if (!body.includes(SELF_HOSTED_RUNNER)) errors.push("Local agent inspect workflow must run only on the gova self-hosted runner.");
  if (body.includes(GITHUB_HOSTED_RUNNER)) errors.push("Local agent inspect workflow must not fall back to GitHub-hosted execution.");
  errors.push(...localWorkspaceViolations(body, "Local agent inspect workflow"));
  if (!body.includes("npx tsx scripts/local-agent-inspect.ts")) {
    errors.push("Local agent inspect workflow must delegate reads to scripts/local-agent-inspect.ts.");
  }
  if (body.includes("${{ secrets.")) errors.push("Local agent inspect workflow must not consume GitHub secrets.");
  errors.push(...runCommandViolations(body, ALLOWED_LOCAL_AGENT_INSPECT_RUN_COMMANDS, "Local agent inspect workflow"));
  const jobIds = docsWorkflowJobIds(body);
  if (jobIds.length !== 1 || jobIds[0] !== "inspect") {
    errors.push(`Local agent inspect workflow must contain exactly one job named inspect. Found: ${jobIds.join(", ") || "(none)"}.`);
  }
  for (const event of [...FORBIDDEN_EVENTS, "push", "pull_request"] as const) {
    if (new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m").test(body)) {
      errors.push(`GitHub event ${event} is forbidden for the local agent inspect workflow.`);
    }
  }
  return errors;
}

export function localAgentCoordinationWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*local-agent-coordination\s*$/m.test(body)) {
    errors.push("Local agent coordination workflow name must be exactly `local-agent-coordination`.");
  }
  if (!/^ {2}workflow_dispatch:\s*$/m.test(body)) errors.push("Local agent coordination workflow must be manually dispatched.");
  for (const input of ["agent_id:", "action:", "scope:", "message_kind:", "message_body:"]) {
    if (!body.includes(input)) errors.push(`Local agent coordination workflow must accept ${input} input.`);
  }
  if (!body.includes("permissions:") || !body.includes("contents: read")) {
    errors.push("Local agent coordination workflow must be read-only against the repository.");
  }
  if (body.includes("contents: write")) errors.push("Local agent coordination workflow must not push to tracked branches.");
  if (!body.includes(SELF_HOSTED_RUNNER)) errors.push("Local agent coordination workflow must run only on the gova self-hosted runner.");
  if (body.includes(GITHUB_HOSTED_RUNNER)) errors.push("Local agent coordination workflow must not fall back to GitHub-hosted execution.");
  if (body.includes("${{ secrets.")) errors.push("Local agent coordination workflow must not consume GitHub secrets.");
  errors.push(...localWorkspaceViolations(body, "Local agent coordination workflow"));
  if (!body.includes("npx tsx scripts/local-agent-coordination.ts")) {
    errors.push("Local agent coordination workflow must delegate to scripts/local-agent-coordination.ts.");
  }
  errors.push(...runCommandViolations(body, ALLOWED_LOCAL_AGENT_COORDINATION_RUN_COMMANDS, "Local agent coordination workflow"));
  const jobIds = docsWorkflowJobIds(body);
  if (jobIds.length !== 1 || jobIds[0] !== "coordinate") {
    errors.push(`Local agent coordination workflow must contain exactly one job named coordinate. Found: ${jobIds.join(", ") || "(none)"}.`);
  }
  for (const event of [...FORBIDDEN_EVENTS, "push", "pull_request"] as const) {
    if (new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m").test(body)) {
      errors.push(`GitHub event ${event} is forbidden for the local agent coordination workflow.`);
    }
  }
  return errors;
}

export function localAgentGatewayWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*local-agent-gateway\s*$/m.test(body)) {
    errors.push("Dispatch gateway workflow name must be exactly `local-agent-gateway`.");
  }
  // The gateway is the one local workflow that must react to a push: an agent
  // without workflow_dispatch API access reaches it by pushing a request branch.
  if (!/^ {2}push:\s*$/m.test(body) || !body.includes('- "agent-request/**"')) {
    errors.push("Dispatch gateway workflow must trigger on push to agent-request/** branches only.");
  }
  if (/^ {4}branches:\s*$/m.test(body) && /^ {6}- main\s*$/m.test(body)) {
    errors.push("Dispatch gateway workflow must never trigger on main.");
  }
  if (/(^|\n)\s*workflow_dispatch\s*:/m.test(body)) {
    errors.push("Dispatch gateway workflow must not be dispatchable itself; it exists to dispatch others.");
  }
  if (!body.includes(SELF_HOSTED_RUNNER)) errors.push("Dispatch gateway workflow must run only on the gova self-hosted runner.");
  if (body.includes(GITHUB_HOSTED_RUNNER)) errors.push("Dispatch gateway workflow must not fall back to GitHub-hosted execution.");
  if (body.includes("${{ secrets.")) {
    errors.push("Dispatch gateway workflow must not consume GitHub secrets; it uses a credential that stays on the machine.");
  }
  errors.push(...localWorkspaceViolations(body, "Dispatch gateway workflow"));
  if (!body.includes("npx tsx scripts/local-agent-gateway.ts")) {
    errors.push("Dispatch gateway workflow must delegate validation and dispatch to scripts/local-agent-gateway.ts.");
  }
  errors.push(...runCommandViolations(body, ALLOWED_LOCAL_AGENT_GATEWAY_RUN_COMMANDS, "Local agent gateway workflow"));
  const jobIds = docsWorkflowJobIds(body);
  if (jobIds.length !== 1 || jobIds[0] !== "gateway") {
    errors.push(`Dispatch gateway workflow must contain exactly one job named gateway. Found: ${jobIds.join(", ") || "(none)"}.`);
  }
  for (const event of [...FORBIDDEN_EVENTS, "pull_request"] as const) {
    if (new RegExp(`(^|\\n)\\s*${event}\\s*:`, "m").test(body)) {
      errors.push(`GitHub event ${event} is forbidden for the dispatch gateway workflow.`);
    }
  }
  return errors;
}

export function collectGithubCiPolicyErrors(root = ROOT): string[] {
  const errors: string[] = [];
  const workflowsDir = path.join(root, ".github", "workflows");
  const prTemplate = path.join(root, ".github", "pull_request_template.md");
  if (existsSync(prTemplate)) errors.push("Pull request templates are forbidden; work lands on main directly.");
  for (const relative of FORBIDDEN_CI_PATHS) {
    if (existsSync(path.join(root, relative))) errors.push(`Forbidden CI/config path must not exist: ${relative.replace(/\\/g, "/")}`);
  }
  if (!existsSync(workflowsDir)) {
    errors.push("Missing .github/workflows — docs and deployment workflows are required.");
    return errors;
  }
  const files = listWorkflowYamlFiles(workflowsDir);
  if (files.length !== ALLOWED_WORKFLOW_FILES.length || files.some((file, index) => file !== ALLOWED_WORKFLOW_FILES[index])) {
    errors.push(`Only ${ALLOWED_WORKFLOW_FILES.join(", ")} may exist under .github/workflows. Found: ${files.join(", ") || "(none)"}.`);
  }
  const docsPath = path.join(workflowsDir, DOCS_WORKFLOW);
  if (existsSync(docsPath)) errors.push(...docsWorkflowViolations(readFileSync(docsPath, "utf8")));
  const deployPath = path.join(workflowsDir, DEPLOY_WORKFLOW);
  if (existsSync(deployPath)) errors.push(...deploymentWorkflowViolations(readFileSync(deployPath, "utf8")));
  else errors.push(`Missing .github/workflows/${DEPLOY_WORKFLOW}.`);
  const localAgentInspectPath = path.join(workflowsDir, LOCAL_AGENT_INSPECT_WORKFLOW);
  if (existsSync(localAgentInspectPath)) {
    errors.push(...localAgentInspectWorkflowViolations(readFileSync(localAgentInspectPath, "utf8")));
  } else {
    errors.push(`Missing .github/workflows/${LOCAL_AGENT_INSPECT_WORKFLOW}.`);
  }
  const localAgentPath = path.join(workflowsDir, LOCAL_AGENT_WORKFLOW);
  if (existsSync(localAgentPath)) errors.push(...localAgentWorkflowViolations(readFileSync(localAgentPath, "utf8")));
  else errors.push(`Missing .github/workflows/${LOCAL_AGENT_WORKFLOW}.`);
  const localAgentWorkspacePath = path.join(workflowsDir, LOCAL_AGENT_WORKSPACE_WORKFLOW);
  if (existsSync(localAgentWorkspacePath)) {
    errors.push(...localAgentWorkflowViolations(readFileSync(localAgentWorkspacePath, "utf8")));
  } else {
    errors.push(`Missing .github/workflows/${LOCAL_AGENT_WORKSPACE_WORKFLOW}.`);
  }
  const localAgentStatusPath = path.join(workflowsDir, LOCAL_AGENT_STATUS_WORKFLOW);
  if (existsSync(localAgentStatusPath)) {
    errors.push(...localAgentStatusWorkflowViolations(readFileSync(localAgentStatusPath, "utf8")));
  } else {
    errors.push(`Missing .github/workflows/${LOCAL_AGENT_STATUS_WORKFLOW}.`);
  }
  const coordinationPath = path.join(workflowsDir, LOCAL_AGENT_COORDINATION_WORKFLOW);
  if (existsSync(coordinationPath)) {
    errors.push(...localAgentCoordinationWorkflowViolations(readFileSync(coordinationPath, "utf8")));
  } else {
    errors.push(`Missing .github/workflows/${LOCAL_AGENT_COORDINATION_WORKFLOW}.`);
  }
  const gatewayPath = path.join(workflowsDir, LOCAL_AGENT_GATEWAY_WORKFLOW);
  if (existsSync(gatewayPath)) {
    errors.push(...localAgentGatewayWorkflowViolations(readFileSync(gatewayPath, "utf8")));
  } else {
    errors.push(`Missing .github/workflows/${LOCAL_AGENT_GATEWAY_WORKFLOW}.`);
  }
  // `main` stays the only project branch, but the control plane needs three
  // namespaces to be creatable. The ruleset script and the pre-push hook must
  // agree with that list exactly — no more, no less.
  const namespacesPath = path.join(root, "packages", "local-agent-core", "src", "control-branch-namespaces.ts");
  if (existsSync(namespacesPath)) {
    const source = readFileSync(namespacesPath, "utf8");
    const declared = [...source.matchAll(/"(refs\/heads\/[^"]+)"/g)].map((match) => match[1]!);
    if (declared.join(",") !== CONTROL_PLANE_BRANCH_NAMESPACES.join(",")) {
      errors.push(`Control-plane branch namespaces changed unexpectedly: ${declared.join(", ") || "(none)"}.`);
    }
  } else {
    errors.push("Missing packages/local-agent-core/src/control-branch-namespaces.ts.");
  }
  const blockBranchesPath = path.join(root, "scripts", "block-branch-creation.ts");
  if (existsSync(blockBranchesPath)) {
    const source = readFileSync(blockBranchesPath, "utf8");
    if (!source.includes("'refs/heads/main', ...CONTROL_PLANE_BRANCH_NAMESPACES")) {
      errors.push("main-only ruleset must exclude main plus exactly the control-plane namespaces.");
    }
  }
  const hookPath = path.join(root, ".githooks", "pre-push.d", "10-main-only");
  if (existsSync(hookPath)) {
    const hook = readFileSync(hookPath, "utf8");
    for (const namespace of CONTROL_PLANE_BRANCH_NAMESPACES) {
      const pattern = namespace.replace(/\*\*$/, "*");
      if (!hook.includes(`${pattern})`)) {
        errors.push(`pre-push hook must let the control-plane namespace through: ${namespace}`);
      }
    }
  }
  const protectPath = path.join(root, "scripts", "protect-main-branch.ts");
  if (existsSync(protectPath)) {
    const protect = readFileSync(protectPath, "utf8");
    if (!protect.includes("Applying branch protection is forbidden")) errors.push("protect-main-branch.ts must refuse to apply branch protection.");
    if (/REQUIRED_STATUS_CHECKS\s*=\s*\[[^\]]*'verify'/.test(protect)) errors.push("protect-main-branch.ts must not require a GitHub status check.");
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
    console.log("GitHub CI policy passed: docs validation plus OIDC-only main deployment; no general app CI.");
  }
}
