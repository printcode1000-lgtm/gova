import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Vercel function size guard.
 *
 * Vercel rejects a serverless function whose uncompressed payload exceeds
 * 250MB, and it rejects it *after* a successful build — at upload. `deploy:all`
 * surfaces that as `BUILD_UTILS_SPAWN_1: Command "npm run build" exited with 1`,
 * which points at the build and not at the upload, and by then the deployment
 * commit is already on GitHub and the isolated services are already live. The
 * repository is left half-published on a failure nothing could have read from
 * the message.
 *
 * Next writes the exact answer during `npm run build`: one `.nft.json` trace per
 * route listing every file that route drags in. Summing those before publishing
 * turns a post-push rejection into a preflight failure that names the route and
 * the largest contributors.
 *
 * `.vercelignore` is honoured, because a file that is never uploaded cannot be
 * inside a function. Without that the check fails locally on paths the
 * deployment never sees — a local Chrome profile, for one — and a guard that
 * cries wolf on the developer's machine is a guard people learn to skip.
 *
 * This reads build output only. It never reaches the network and needs no
 * credentials.
 */

const ROOT = process.cwd();
const APP_ROOT = path.join(ROOT, ".next", "server", "app");
const HARD_LIMIT_BYTES = 250 * 1000 * 1000;
const WARN_BYTES = 200 * 1000 * 1000;

interface RouteSize {
  route: string;
  bytes: number;
  fileCount: number;
  contributors: Array<{ label: string; bytes: number }>;
}

/** Path prefixes and suffixes `.vercelignore` keeps out of the upload. */
function vercelIgnoreMatchers(): { prefixes: string[]; suffixes: string[] } {
  const manifest = path.join(ROOT, ".vercelignore");
  if (!existsSync(manifest)) return { prefixes: [], suffixes: [] };

  const prefixes: string[] = [];
  const suffixes: string[] = [];
  for (const raw of readFileSync(manifest, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    if (line.startsWith("*")) {
      suffixes.push(line.slice(1));
      continue;
    }
    // `**/x` and `/x` and `x/` all mean "this path segment", for our purposes.
    prefixes.push(line.replace(/^\*\*\//, "").replace(/^\//, "").replace(/\/$/, ""));
  }
  return { prefixes, suffixes };
}

function isUploaded(
  relative: string,
  matchers: { prefixes: string[]; suffixes: string[] },
): boolean {
  const normalized = relative.split(path.sep).join("/");
  if (matchers.suffixes.some((suffix) => normalized.endsWith(suffix))) return false;
  return !matchers.prefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function traceFiles(directory: string, found: string[] = []): string[] {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) {
      traceFiles(full, found);
      continue;
    }
    if (entry.endsWith(".nft.json")) found.push(full);
  }
  return found;
}

/** Group a traced path into something a human can act on. */
function contributorLabel(absolute: string): string {
  const relative = path.relative(ROOT, absolute).split(path.sep);
  const marker = relative.indexOf("node_modules");
  if (marker !== -1) {
    const scoped = relative[marker + 1]?.startsWith("@");
    return ["node_modules", ...relative.slice(marker + 1, marker + (scoped ? 3 : 2))].join("/");
  }
  return relative.slice(0, 2).join("/");
}

function measure(
  tracePath: string,
  matchers: { prefixes: string[]; suffixes: string[] },
): RouteSize {
  const base = path.dirname(tracePath);
  const trace = JSON.parse(readFileSync(tracePath, "utf8")) as { files?: string[] };
  const perContributor = new Map<string, number>();
  let bytes = 0;
  let fileCount = 0;

  for (const entry of trace.files ?? []) {
    const absolute = path.resolve(base, entry);
    if (!isUploaded(path.relative(ROOT, absolute), matchers)) continue;
    let size: number;
    try {
      size = statSync(absolute).size;
    } catch {
      continue; // A trace may name a file this checkout does not produce.
    }
    bytes += size;
    fileCount += 1;
    const label = contributorLabel(absolute);
    perContributor.set(label, (perContributor.get(label) ?? 0) + size);
  }

  return {
    route: path
      .relative(APP_ROOT, tracePath)
      .replace(/\/route\.js\.nft\.json$/, "")
      .replace(/\/page\.js\.nft\.json$/, ""),
    bytes,
    fileCount,
    contributors: [...perContributor.entries()]
      .map(([label, size]) => ({ label, bytes: size }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5),
  };
}

function megabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)}MB`;
}

function main(): void {
  if (!existsSync(APP_ROOT)) {
    console.error(
      "[vercel:function-size] No build output at .next/server/app. Run `npm run build` first.",
    );
    process.exit(1);
  }

  const traces = traceFiles(APP_ROOT);
  if (traces.length === 0) {
    console.error(
      "[vercel:function-size] Build output contains no route traces; refusing to report a clean check.",
    );
    process.exit(1);
  }

  const matchers = vercelIgnoreMatchers();
  const routes = traces
    .map((trace) => measure(trace, matchers))
    .sort((a, b) => b.bytes - a.bytes);
  const oversized = routes.filter((route) => route.bytes > HARD_LIMIT_BYTES);
  const warned = routes.filter(
    (route) => route.bytes > WARN_BYTES && route.bytes <= HARD_LIMIT_BYTES,
  );

  console.log(`[vercel:function-size] ${routes.length} route(s) measured.`);
  for (const route of routes.slice(0, 3)) {
    console.log(`  ${megabytes(route.bytes).padStart(8)}  ${route.route} (${route.fileCount} files)`);
  }

  for (const route of warned) {
    console.warn(
      `[vercel:function-size] WARNING ${route.route} is ${megabytes(route.bytes)}, approaching the 250MB limit.`,
    );
  }

  if (oversized.length === 0) {
    console.log("[vercel:function-size] Every route is within Vercel's 250MB limit.");
    return;
  }

  for (const route of oversized) {
    console.error(
      `\n[vercel:function-size] ${route.route} is ${megabytes(route.bytes)} across ${route.fileCount} files — over Vercel's 250MB limit.`,
    );
    for (const contributor of route.contributors) {
      console.error(`    ${megabytes(contributor.bytes).padStart(8)}  ${contributor.label}`);
    }
  }
  console.error(
    "\n[vercel:function-size] Vercel would reject this at upload, after the deployment commit is already pushed." +
      "\nExclude what the route cannot need at runtime through `outputFileTracingExcludes` in next.config.ts," +
      "\nor stop committing the offending directory. See docs/08-troubleshooting/problems/vercel-function-size-release-console.md.",
  );
  process.exit(1);
}

main();
