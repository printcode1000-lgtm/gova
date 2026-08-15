/**
 * Unit: plugin proxies must never be mistaken for promises.
 *
 * A Capacitor plugin with no web implementation returns a callable for *any*
 * property read, `then` included. Resolving a promise with such an object makes
 * the runtime read `.then`, find a function, and call it — which surfaces as
 * "<Plugin>.then() is not implemented on web" from code that never mentioned
 * `then`.
 *
 * The ordering is the whole point: an `async` loader that returns the raw plugin
 * has already resolved a promise with it by the time the caller sees anything,
 * so sanitizing after the `await` cannot help. These tests pin both the fix and
 * that ordering, because the failure only appears in a real browser and no
 * integration test in this repo can reach it.
 */

import assert from "node:assert/strict";
import { sanitizePlugin } from "../../adapters/lazy-plugin";

/** A stand-in for a Capacitor plugin with no web implementation. */
function pluginWithoutWebImplementation(name: string): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get(_target, property) {
        return () => {
          throw new Error(`${name}.${String(property)}() is not implemented on web`);
        };
      },
    },
  ) as Record<string, unknown>;
}

// ── 1. The unsanitized shape really does throw ─────────────────────────────
const raw = pluginWithoutWebImplementation("Share");
let rawThrew = false;
try {
  await (async () => raw)();
} catch (error) {
  rawThrew = true;
  assert.match(
    error instanceof Error ? error.message : String(error),
    /then\(\) is not implemented on web/,
    "The unsanitized failure must be the documented then() error.",
  );
}
assert.equal(
  rawThrew,
  true,
  "Returning a raw plugin proxy from an async function must throw — if this ever stops being true, the sanitize can be reconsidered.",
);

// ── 2. Sanitizing makes the same value safe to resolve a promise with ──────
const safe = await (async () => sanitizePlugin(raw))();
assert.ok(safe, "A sanitized plugin must survive being returned from an async function.");
assert.equal(
  (safe as { then?: unknown }).then,
  undefined,
  "`then` must read as undefined so the runtime treats the plugin as a plain value.",
);
assert.equal("then" in (safe as object), false, "`then` must not appear to be present.");

// ── 3. Sanitizing preserves the plugin's real behaviour ────────────────────
const working = sanitizePlugin({
  value: 42,
  getValue(this: { value: number }) {
    return this.value;
  },
});
assert.equal(working.value, 42, "Data properties must pass through untouched.");
assert.equal(
  working.getValue(),
  42,
  "Methods must stay bound to the plugin, not to the proxy.",
);

// ── 4. Non-objects pass through unchanged ──────────────────────────────────
assert.equal(sanitizePlugin(null), null);
assert.equal(sanitizePlugin(undefined), undefined);
assert.equal(sanitizePlugin(7), 7);

// ── 5. Every adapter loader must sanitize before returning ─────────────────
// The guard above only helps where it is actually applied. A loader that
// returns a bare plugin identifier throws inside itself, before
// `createLazyPlugin` can do anything about it.
const { readdirSync, readFileSync } = await import("node:fs");
const path = await import("node:path");

const adaptersDir = path.resolve("packages", "native-core", "src", "adapters");
const rawLoaderPattern =
  /createLazyPlugin\([^)]*?,\s*async \(\) => \{\s*\n\s*return\s+([A-Za-z_$][A-Za-z0-9_$]*);\s*\n\s*\}\)/g;

const offenders: string[] = [];
for (const entry of readdirSync(adaptersDir)) {
  if (!entry.endsWith(".adapter.ts")) continue;
  const source = readFileSync(path.join(adaptersDir, entry), "utf8");
  for (const match of source.matchAll(rawLoaderPattern)) {
    offenders.push(`${entry}: returns ${match[1]} unsanitized`);
  }
}

assert.deepEqual(
  offenders,
  [],
  "Every lazy plugin loader must return sanitizePlugin(x) or a boxed { plugin: x }:\n  " +
    offenders.join("\n  "),
);

console.log("Lazy plugin sanitization tests passed.");
