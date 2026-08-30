import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, statSync } from "node:fs";
import path from "node:path";

const workspace = process.env.GOVA_LOCAL_WORKSPACE || "/home/hesham/gova";
const pathInput = process.env.LOCAL_AGENT_STATUS_PATHS || "";
const token = process.env.GOVA_RUNNER_STATUS_TOKEN?.trim();
const MAX_PATHS = 10_000;

function run(command: string, args: string[], cwd = workspace): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function relativeInsideWorkspace(candidate: string): string | null {
  const resolved = path.resolve(workspace, candidate);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative || ".";
}

function isSecretPath(relativePath: string): boolean {
  return (
    relativePath === ".env" ||
    relativePath.startsWith(".env.") ||
    relativePath.startsWith(".secret-archive/") ||
    relativePath.startsWith(".ota/private-key") ||
    relativePath.startsWith("config/secret-archive") ||
    relativePath.endsWith(".pem") ||
    relativePath.endsWith(".p8") ||
    relativePath.endsWith(".key")
  );
}

async function githubJson(url: string): Promise<Record<string, unknown>> {
  if (!token) return { error: "GOVA_RUNNER_STATUS_TOKEN unavailable" };
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gova-local-agent-status",
    },
  });
  if (!response.ok) return { error: `${response.status} ${response.statusText}` };
  return response.json();
}

function summarizeRunners(payload: Record<string, unknown>): unknown {
  if (!Array.isArray(payload.runners)) return payload;
  return {
    totalCount: payload.total_count,
    runners: payload.runners.map((runner) => {
      const item = runner as {
        name?: string;
        status?: string;
        busy?: boolean;
        labels?: Array<{ name?: string }>;
      };
      return {
        name: item.name,
        status: item.status,
        busy: item.busy,
        labels: (item.labels || []).map((label) => label.name).filter(Boolean),
      };
    }),
  };
}

function summarizeRuns(payload: Record<string, unknown>): unknown {
  if (!Array.isArray(payload.workflow_runs)) return payload;
  return {
    totalCount: payload.total_count,
    runs: payload.workflow_runs.map((run) => {
      const item = run as {
        name?: string;
        status?: string;
        conclusion?: string | null;
        head_sha?: string;
        event?: string;
        html_url?: string;
        created_at?: string;
        updated_at?: string;
      };
      return {
        name: item.name,
        status: item.status,
        conclusion: item.conclusion,
        headSha: item.head_sha,
        event: item.event,
        url: item.html_url,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    }),
  };
}

function requestedPaths(): string[] {
  const raw = pathInput
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (raw.includes("__tracked__")) {
    return run("git", ["ls-files", "-z"])
      .split("\0")
      .filter(Boolean)
      .slice(0, MAX_PATHS);
  }
  return raw.slice(0, MAX_PATHS);
}

function localPathStatus(inputPath: string): Record<string, unknown> {
  const relative = relativeInsideWorkspace(inputPath);
  if (!relative) return { path: inputPath, error: "outside-workspace" };
  const absolute = path.join(workspace, relative);
  if (!existsSync(absolute)) return { path: relative, exists: false };
  const stats = lstatSync(absolute);
  let tracked = false;
  try {
    run("git", ["ls-files", "--error-unmatch", relative]);
    tracked = true;
  } catch {
    tracked = false;
  }
  return {
    path: relative,
    exists: true,
    type: stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other",
    mode: (stats.mode & 0o777).toString(8),
    size: stats.isFile() ? statSync(absolute).size : undefined,
    modified: stats.mtime.toISOString(),
    tracked,
    secretLike: isSecretPath(relative),
    content: isSecretPath(relative) ? "redacted" : undefined,
  };
}

async function main(): Promise<void> {
  run("git", ["fetch", "--prune", "origin", "main"]);
  const head = run("git", ["rev-parse", "HEAD"]);
  const originMain = run("git", ["rev-parse", "origin/main"]);
  const status = run("git", ["status", "--short", "--branch"]);
  const branch = run("git", ["branch", "--show-current"]);
  const paths = requestedPaths();
  const runners = await githubJson("https://api.github.com/repos/printcode1000-lgtm/gova/actions/runners?per_page=100");
  const runs = await githubJson("https://api.github.com/repos/printcode1000-lgtm/gova/actions/runs?per_page=10");

  console.log(
    JSON.stringify(
      {
        workspace,
        branch,
        head,
        originMain,
        clean: status === "## main...origin/main",
        status,
        checkedPathCount: paths.length,
        checkedPathLimit: MAX_PATHS,
        checkedPaths: paths.map(localPathStatus),
        github: {
          runners: summarizeRunners(runners),
          runs: summarizeRuns(runs),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
