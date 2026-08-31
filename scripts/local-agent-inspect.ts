import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ensureDir, git, gitSoft, heartbeat, inspectLogsDir, isSecretPath, relativeInsideWorkspace, runCapture, safeIdentifier, workspaceDir } from "@asol/local-agent-core";
/**
 * Read-only inspection of the local workspace on behalf of a remote agent.
 *
 * Results are written to a local file and only a summary is printed, because
 * GitHub job logs truncate and are visible far more widely than this machine.
 * Secret-bearing files are reported as metadata and never opened.
 */

const MAX_PATHS = 50_000;

const workspace = workspaceDir();
const mode = process.env.LOCAL_AGENT_INSPECT_MODE?.trim() || "search";
const pattern = process.env.LOCAL_AGENT_INSPECT_PATTERN?.trim() || "";
const agentId = safeIdentifier(process.env.LOCAL_AGENT_ID?.trim() || "agent", 48) || "agent";
const runId = safeIdentifier(process.env.GITHUB_RUN_ID?.trim() || String(Date.now()), 32);

function requestedPaths(): string[] {
  const raw = (process.env.LOCAL_AGENT_INSPECT_PATHS || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (raw.length === 0 || raw.includes("__tracked__")) {
    return git(["ls-files"], workspace).split("\n").filter(Boolean).slice(0, MAX_PATHS);
  }
  return raw.slice(0, MAX_PATHS);
}

function readFiles(paths: string[]): string {
  const sections: string[] = [];
  for (const inputPath of paths) {
    const relative = relativeInsideWorkspace(inputPath, workspace);
    if (!relative) {
      sections.push(`===== ${inputPath} =====\nERROR: outside-workspace\n`);
      continue;
    }
    if (isSecretPath(relative)) {
      sections.push(`===== ${relative} =====\nREDACTED: secret-bearing path\n`);
      continue;
    }
    const absolute = path.join(workspace, relative);
    if (!existsSync(absolute)) {
      sections.push(`===== ${relative} =====\nERROR: missing\n`);
      continue;
    }
    sections.push(`===== ${relative} =====\n${readFileSync(absolute, "utf8")}\n`);
  }
  return sections.join("\n");
}

/**
 * Search with ripgrep when it is installed, otherwise with `git grep`.
 *
 * The fallback matters: the runner host does not necessarily carry ripgrep, and
 * an inspection that dies on a missing binary is worse than a slower one.
 */
function searchFiles(paths: string[]): string {
  if (!pattern) throw new Error("LOCAL_AGENT_INSPECT_PATTERN is required for search mode.");
  const safePaths = paths
    .map((item) => relativeInsideWorkspace(item, workspace))
    .filter((item): item is string => Boolean(item))
    .filter((item) => !isSecretPath(item));
  if (safePaths.length === 0) return "";

  const explicitFiles = safePaths.filter((item) => {
    const absolute = path.join(workspace, item);
    return existsSync(absolute) && statSync(absolute).isFile();
  });
  const searchablePaths = safePaths.filter((item) => !explicitFiles.includes(item));
  const sections: string[] = [];
  if (explicitFiles.length > 0) {
    let matcher: RegExp;
    try { matcher = new RegExp(pattern); }
    catch (error) { throw new Error(`Invalid search pattern: ${error instanceof Error ? error.message : String(error)}`); }
    for (const file of explicitFiles) {
      const lines = readFileSync(path.join(workspace, file), "utf8").split(/?
/);
      lines.forEach((line, index) => {
        if (matcher.test(line)) sections.push(`${file}:${index + 1}:${line}`);
      });
    }
  }
  if (searchablePaths.length === 0) return sections.join("
");

  const ripgrep = runCapture("rg", ["--line-number", "--column", "--no-heading", "--", pattern, ...searchablePaths], workspace);
  if (ripgrep.status === 0) return [...sections, ripgrep.stdout].filter(Boolean).join("
");
  if (ripgrep.status === 1 && !ripgrep.stderr) return sections.join("
");

  const grep = runCapture(
    "git",
    ["grep", "--line-number", "--no-color", "-I", "-e", pattern, "--", ...searchablePaths],
    workspace,
  );
  if (grep.status === 0) return [...sections, grep.stdout].filter(Boolean).join("
");
  if (grep.status === 1) return sections.join("
");
  throw new Error(`Search failed: ${grep.stderr || ripgrep.stderr || "unknown error"}`);
}

function gitState(): string {
  return [
    "===== branch =====",
    gitSoft(["branch", "--show-current"], workspace),
    "===== head =====",
    git(["rev-parse", "HEAD"], workspace),
    "===== origin/main =====",
    gitSoft(["rev-parse", "origin/main"], workspace),
    "===== status =====",
    gitSoft(["status", "--short", "--branch"], workspace),
    "===== recent =====",
    gitSoft(["log", "--oneline", "-20"], workspace),
  ].join("\n");
}

function main(): void {
  heartbeat(agentId, "inspecting");
  gitSoft(["fetch", "--prune", "origin", "main"], workspace);
  const paths = mode === "git" ? [] : requestedPaths();
  let output = "";
  if (mode === "read") output = readFiles(paths);
  else if (mode === "search") output = searchFiles(paths);
  else if (mode === "list") output = paths.join("\n");
  else if (mode === "git") output = gitState();
  else throw new Error(`Unsupported inspect mode: ${mode}`);

  const file = path.join(
    ensureDir(inspectLogsDir()),
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${agentId}-${runId}.txt`,
  );
  writeFileSync(file, output, { mode: 0o600 });
  console.log(
    JSON.stringify({ workspace, mode, pathCount: paths.length, outputFile: file, bytes: Buffer.byteLength(output) }, null, 2),
  );
}

main();
