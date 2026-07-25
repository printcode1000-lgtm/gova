import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["src", "scripts"].map((item) => path.join(root, item));
const violations: string[] = [];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

function rel(file: string) {
  return path.relative(root, file).replace(/\\/g, "/");
}

const files = sourceRoots.flatMap((dir) => walk(dir));

for (const file of files) {
  const relative = rel(file);
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const generatedInitScript =
    relative === "src/lib/app-init/build-app-init-script.ts" ||
    relative === "src/theme/runtime/build-theme-init-script.ts";

  if (!generatedInitScript && /catch\s*\{\s*\}/.test(content)) {
    violations.push(`${relative}: empty catch block loses error details`);
  }

  if (
    relative.startsWith("src/app/api/") &&
    relative.endsWith("/route.ts") &&
    !relative.endsWith("src/app/api/health/route.ts")
  ) {
    const hasTracing = content.includes("runTracedBusinessRoute(");
    const hasCatch = /catch\s*\(/.test(content);
    if (!hasTracing && !hasCatch) {
      violations.push(`${relative}: API route has no tracing wrapper or catch block`);
    }
    if (/catch\s*\([^)]*\)\s*\{[^}]*apiError\([^)]*searchFailed[^)]*\)/s.test(content)) {
      violations.push(`${relative}: caught search errors must use mapServiceError`);
    }
  }

  lines.forEach((line, index) => {
    const suppressesRejection = /\.catch\(\s*\(\)\s*=>\s*(undefined|null)/.test(line);
    const contextWindow = lines.slice(Math.max(0, index - 5), index + 1).join("\n");
    const suppressesLoggingFailure =
      contextWindow.includes("logServerSystemIssue(") ||
      contextWindow.includes("persistentSystemLogApiService.ingest(");
    if (suppressesRejection && !suppressesLoggingFailure) {
      violations.push(
        `${relative}:${index + 1}: promise rejection is suppressed without logging context`,
      );
    }
  });
}

if (violations.length > 0) {
  console.error("Error logging validation failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Error logging validation passed.");
