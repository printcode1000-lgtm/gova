import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
/**
 * Local GitHub CI policy.
 *
 * GitHub Actions has only documentation validation and manual local-agent
 * bootstrap. Production deployment is always invoked by local release commands.
 *
 * This module is invoked by local npm scripts and `architecture:check`. It is
 * not a general application CI job.
 */

const ROOT = process.cwd();
const DOCS_WORKFLOW = "docs.yml";
const LOCAL_AGENT_BOOTSTRAP_WORKFLOW = "local-agent-bootstrap.yml";

/**
 * Control-plane paths that must never trigger a production deployment. A
 * coordination change alters how agents work on this machine; it does not
 * change what production serves.
 */
export const DEPLOY_CONTROL_PLANE_IGNORES = [
  ".github/workflows/local-agent-*.yml",
  "tools/local-agent/**",
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
export const RELEASE_OWNED_COMMIT_PREFIXES = ["deploy(push):", "deploy(main):"] as const;

export const ALLOWED_WORKFLOW_FILES = [DOCS_WORKFLOW, LOCAL_AGENT_BOOTSTRAP_WORKFLOW] as const;

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
  "package.json",
  "package-lock.json",
  ".github/workflows/docs.yml",
  ".github/workflows/local-agent-bootstrap.yml",
  "tools/local-agent/**",
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
  for (const prefix of RELEASE_OWNED_COMMIT_PREFIXES) {
    if (!body.includes(`startsWith(github.event.head_commit.message, '${prefix}')`)) {
      errors.push(`Deployment workflow must skip release-owned commit prefix: ${prefix}`);
    }
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
 * in `/home/hesham/gova`, use that canonical checkout as the bootstrap source,
 * and never re-materialise or route normal work through an integration worktree.
 */
export function localAgentBootstrapWorkflowViolations(source: string): string[] {
  const errors: string[] = [];
  const body = stripYamlComments(source);
  if (!/^name:\s*local-agent-bootstrap\s*$/m.test(body)) errors.push("Local agent bootstrap workflow name must be exactly `local-agent-bootstrap`.");
  if (!/^ {2}workflow_dispatch:\s*$/m.test(body)) errors.push("Local agent bootstrap workflow must be manually dispatched.");
  if (!/workflow_dispatch:\s*\n\s+inputs:\s*\n\s+execution_mode:[\s\S]*?type:\s*choice[\s\S]*?options:\s*\n\s+- A\s*$/m.test(body)) errors.push("Local agent bootstrap must require the Mode A workflow_dispatch input.");
  if (/(^|\n)\s*(push|pull_request)\s*:/m.test(body)) errors.push("Local agent bootstrap must not run on push or pull_request.");
  if (!body.includes("permissions:") || !body.includes("contents: read") || body.includes("contents: write")) errors.push("Local agent bootstrap must be repository read-only.");
  if (!body.includes(SELF_HOSTED_RUNNER) || body.includes(GITHUB_HOSTED_RUNNER)) errors.push("Local agent bootstrap must run only on the gova self-hosted runner.");
  if (body.includes("${{ secrets.")) errors.push("Local agent bootstrap must not consume GitHub secrets.");
  // The message names what it found: this workflow's whole point is that it
  // reuses the host toolchain, and "must not reinstall dependencies" alone left
  // the operator to guess which step tripped it.
  const reinstallSteps = ["actions/checkout@", "actions/setup-node@", "npm ci"].filter((step) => body.includes(step));
  if (reinstallSteps.length > 0) errors.push(`Local agent bootstrap must reuse the host checkout/toolchain and must not reinstall dependencies. Forbidden step(s): ${reinstallSteps.join(", ")}.`);
  if (!body.includes("GOVA_AGENT_REPO=/home/hesham/gova") || !body.includes("/home/hesham/gova/tools/local-agent/install.sh")) errors.push("Local agent bootstrap must install from the canonical checkout `/home/hesham/gova`.");
  if (!body.includes('test "${{ inputs.execution_mode }}" = A')) errors.push("Local agent bootstrap must reject any execution mode other than A.");
  if (body.includes("/home/hesham/gova-agents/integration") || /git\s+-C\s+\/home\/hesham\/gova\s+worktree\s+add/.test(body)) errors.push("Local agent bootstrap must not create or use the integration worktree.");
  const jobIds = docsWorkflowJobIds(body);
  if (jobIds.length !== 1 || jobIds[0] !== "bootstrap") errors.push(`Local agent bootstrap must contain exactly one bootstrap job. Found: ${jobIds.join(", ") || "(none)"}.`);
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
    errors.push("Missing .github/workflows — docs and local-agent bootstrap workflows are required.");
    return errors;
  }
  const files = listWorkflowYamlFiles(workflowsDir);
  if (files.length !== ALLOWED_WORKFLOW_FILES.length || files.some((file, index) => file !== ALLOWED_WORKFLOW_FILES[index])) {
    errors.push(`Only ${ALLOWED_WORKFLOW_FILES.join(", ")} may exist under .github/workflows. Found: ${files.join(", ") || "(none)"}.`);
  }
  const docsPath = path.join(workflowsDir, DOCS_WORKFLOW);
  if (existsSync(docsPath)) errors.push(...docsWorkflowViolations(readFileSync(docsPath, "utf8")));
  const bootstrapPath = path.join(workflowsDir, LOCAL_AGENT_BOOTSTRAP_WORKFLOW);
  if (existsSync(bootstrapPath)) errors.push(...localAgentBootstrapWorkflowViolations(readFileSync(bootstrapPath, "utf8")));
  else errors.push(`Missing .github/workflows/${LOCAL_AGENT_BOOTSTRAP_WORKFLOW}.`);
  const blockBranchesPath = path.join(root, "scripts", "block-branch-creation.ts");
  if (existsSync(blockBranchesPath)) {
    const source = readFileSync(blockBranchesPath, "utf8");
    if (!source.includes("exclude: ['refs/heads/main', 'refs/heads/integration']")) errors.push("fixed-two-branches ruleset must exclude exactly main and integration.");
    if (source.includes("CONTROL_PLANE_BRANCH_NAMESPACES") || source.includes("agent-request/chatgpt")) errors.push("branch ruleset utility still references the retired control branch architecture.");
  }
  const hookPath = path.join(root, ".githooks", "pre-push.d", "10-main-only");
  if (existsSync(hookPath)) {
    const hook = readFileSync(hookPath, "utf8");
    if (!hook.includes("refs/heads/main|refs/heads/integration") || hook.includes("agent-request/chatgpt")) errors.push("pre-push hook must allow exactly main and integration.");
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
    console.log("GitHub CI policy passed: docs validation plus manual local-agent bootstrap; no automatic deployment.");
  }
}
