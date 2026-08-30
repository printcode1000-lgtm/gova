import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const workspace = process.env.GOVA_LOCAL_WORKSPACE || "/home/hesham/gova";
const coordinationDir = process.env.GOVA_AGENT_COORDINATION_DIR || "/home/hesham/github-runners/gova-coordination";
const mode = process.env.LOCAL_AGENT_INSPECT_MODE || "search";
const pathsInput = process.env.LOCAL_AGENT_INSPECT_PATHS || "";
const pattern = process.env.LOCAL_AGENT_INSPECT_PATTERN || "";
const agentId = (process.env.LOCAL_AGENT_ID || "agent").replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 64);
const runId = process.env.GITHUB_RUN_ID || String(Date.now());
const MAX_PATHS = 50_000;

function run(command: string, args: string[], cwd = workspace): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function requestedPaths(): string[] {
  const raw = pathsInput
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (raw.length === 0 || raw.includes("__tracked__")) {
    return run("git", ["ls-files", "-z"])
      .split("\0")
      .filter(Boolean)
      .slice(0, MAX_PATHS);
  }
  return raw.slice(0, MAX_PATHS);
}

function relativeInsideWorkspace(candidate: string): string | null {
  const resolved = path.resolve(workspace, candidate);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative || ".";
}

function outputPath(): string {
  const outDir = path.join(coordinationDir, "logs", "inspect");
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  return path.join(outDir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${agentId}-${runId}.txt`);
}

function readFiles(paths: string[]): string {
  const sections: string[] = [];
  for (const inputPath of paths) {
    const relative = relativeInsideWorkspace(inputPath);
    if (!relative) {
      sections.push(`===== ${inputPath} =====\nERROR: outside-workspace\n`);
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

function searchFiles(paths: string[]): string {
  if (!pattern) throw new Error("LOCAL_AGENT_INSPECT_PATTERN is required for search mode.");
  const safePaths = paths
    .map(relativeInsideWorkspace)
    .filter((item): item is string => Boolean(item));
  if (safePaths.length === 0) return "";
  try {
    return run("rg", ["--line-number", "--column", "--hidden", "--no-ignore", "--", pattern, ...safePaths]);
  } catch (error) {
    const result = error as { status?: number; stdout?: Buffer | string };
    if (result.status === 1) return "";
    throw error;
  }
}

function listFiles(paths: string[]): string {
  return paths.join("\n");
}

function gitState(): string {
  return [
    "===== branch =====",
    run("git", ["branch", "--show-current"]).trim(),
    "===== head =====",
    run("git", ["rev-parse", "HEAD"]).trim(),
    "===== origin/main =====",
    run("git", ["rev-parse", "origin/main"]).trim(),
    "===== status =====",
    run("git", ["status", "--short", "--branch"]).trim(),
  ].join("\n");
}

function main(): void {
  run("git", ["fetch", "--prune", "origin", "main"]);
  const paths = requestedPaths();
  let output = "";
  if (mode === "read") output = readFiles(paths);
  else if (mode === "search") output = searchFiles(paths);
  else if (mode === "list") output = listFiles(paths);
  else if (mode === "git") output = gitState();
  else throw new Error(`Unsupported inspect mode: ${mode}`);

  const file = outputPath();
  writeFileSync(file, output, { mode: 0o600 });
  console.log(
    JSON.stringify(
      {
        workspace,
        mode,
        pathCount: paths.length,
        outputFile: file,
        bytes: Buffer.byteLength(output),
      },
      null,
      2,
    ),
  );
}

main();
