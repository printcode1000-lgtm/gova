import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Every declared door must survive being imported with nothing configured.
 *
 * Six of the eight breaks in the enforcement refactor were one shape: a
 * dependency correctly inverted into a port, and a place that resolves it left
 * unwired. Neither `typecheck` nor `architecture:check` sees that — both stayed
 * green throughout — because the failure is a runtime throw, and sometimes only
 * on a build machine, after the deployment commit is already on GitHub.
 *
 * `specialty-columns.server.ts` read its port at module scope, so importing the
 * file — not calling it — decided whether the process survived, and
 * `products-composition` died with `categoryCatalog… is not configured`. This
 * test is that failure turned into a check: import each door in a bare process
 * where nothing has been composed, and require that the import itself does not
 * throw.
 *
 * It asserts the rule the docs state — a port is only inverted if it is also
 * resolved lazily. A door may still throw when a *function* is called without
 * configuration; that is correct, and is why the child only imports.
 *
 * Server-only doors are imported under the `react-server` condition, matching
 * how the application loads them.
 */
const ROOT = process.cwd();
const PACKAGES = path.join(ROOT, "packages");

interface Door {
  specifier: string;
  /** `server-only` modules need the react-server condition, as the app uses. */
  serverOnly: boolean;
}

function doorTarget(manifest: Record<string, unknown>, entry: unknown): string | null {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") {
    const record = entry as { default?: unknown; types?: unknown };
    if (typeof record.default === "string") return record.default;
    if (typeof record.types === "string") return record.types;
  }
  void manifest;
  return null;
}

function collectDoors(): Door[] {
  const doors: Door[] = [];
  for (const folder of readdirSync(PACKAGES)) {
    const manifestPath = path.join(PACKAGES, folder, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name?: string;
      exports?: Record<string, unknown>;
    };
    if (!manifest.name?.startsWith("@asol/")) continue;

    for (const [door, entry] of Object.entries(manifest.exports ?? {})) {
      const target = doorTarget(manifest, entry);
      if (!target) continue;
      const file = path.join(PACKAGES, folder, target.replace(/^\.\//, ""));
      if (!existsSync(file)) continue;

      // Scripts exported as doors are executables, not modules to import: they
      // run work on import by design.
      if (door.includes("/scripts/")) continue;

      const source = readFileSync(file, "utf8");

      doors.push({
        specifier: door === "." ? manifest.name : `${manifest.name}/${door.slice(2)}`,
        serverOnly: source.includes("server-only"),
      });
    }
  }
  return doors;
}

function runImport(specifier: string, reactServer: boolean): { ok: boolean; output: string } {
  const result = spawnSync(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
      "--eval",
      `import(${JSON.stringify(specifier)}).then(() => {}, (error) => { console.error(error?.message ?? error); process.exit(1); });`,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: reactServer
        ? { ...process.env, NODE_OPTIONS: "--conditions=react-server" }
        : process.env,
    },
  );
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

/**
 * `server-only` is transitive: a composition door reaches it through what it
 * imports, without the marker in its own entry file. Rather than guess the
 * runtime from a string, try the plain condition and retry under `react-server`
 * when Node reports exactly that mismatch. Both are real load modes for this
 * repository, and a door only fails here when it throws in both.
 */
const CLIENT_BOUNDARY = "cannot be imported from a Client Component";

/**
 * Bare Node has no loader for a stylesheet or a binary asset, and a browser
 * door reaches one transitively — `@asol/map-core` through `maplibre-gl`. That
 * is a runtime boundary, not an architectural one, and this check is about
 * ports resolved at module scope.
 *
 * Classified from the failure rather than guessed from the entry file, because
 * the import that cannot load is usually several modules deep.
 */
const NO_LOADER = /Unknown file extension "\.[a-z0-9]+"/i;

function importsCleanly(door: Door): { ok: boolean; output: string } {
  const plain = runImport(door.specifier, door.serverOnly);
  if (plain.ok) return plain;
  if (!door.serverOnly && plain.output.includes(CLIENT_BOUNDARY)) {
    return runImport(door.specifier, true);
  }
  return plain;
}

const doors = collectDoors();
assert.ok(doors.length > 50, `Expected the repository's doors, found ${doors.length}.`);

const failures: string[] = [];
const browserOnly: string[] = [];
for (const door of doors) {
  const { ok, output } = importsCleanly(door);
  if (ok) continue;
  if (NO_LOADER.test(output)) {
    browserOnly.push(door.specifier);
    continue;
  }
  failures.push(`${door.specifier}\n    ${output.split("\n").slice(0, 3).join("\n    ")}`);
}

assert.deepEqual(
  failures,
  [],
  `A door threw while being imported with nothing composed. A port resolved at module scope makes import order part of the contract — resolve it inside the function that needs it, memoise if the work is expensive, and expose a reset for tests.\n\n${failures.join("\n\n")}`,
);

if (browserOnly.length > 0) {
  console.log(
    `Skipped ${browserOnly.length} browser-only door(s) with no Node loader: ${browserOnly.join(", ")}`,
  );
}

console.log(
  `Import-without-composition contract passed (${doors.length - browserOnly.length} doors imported bare).`,
);
