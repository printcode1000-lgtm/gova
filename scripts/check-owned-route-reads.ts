#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";

import { resolveDeployedOrigin } from "./deployed-origin-resolution";
import { loadReleaseEnvironment } from "./load-release-env";
import { KNOWN_UNSHIPPED, shippedRoutes } from "./route-ownership-coverage";

loadReleaseEnvironment();

/**
 * Ask every owned read route on every account, not one per account.
 *
 * `smoke:services` and `smoke:deployed` each probe a single route per account.
 * That proves the account is alive; it cannot prove the account can serve the
 * surface it owns. Three separate outages hid in that gap:
 *
 * - `control` shipped with no data ports registered — every data route 500,
 *   health 200;
 * - 63 route+method pairs were owned by accounts that shipped no handler —
 *   `POST /api/auth/login` among them, a `404` in production;
 * - the isolated accounts pinned `dataSource: 'remote'` but not `isDevRuntime`,
 *   so every advertisements read answered
 *   "Turso advertisements DB cannot be accessed during development runtime".
 *
 * Each was invisible to a one-probe gate and each reached production. This
 * sweep closes that class: a `5xx` from any owned read is a failure.
 *
 * **Reads only, and that is deliberate.** A `GET` has no side effect, so the
 * whole owned surface can be swept against real production origins without
 * writing anything. Write methods are covered by the ownership-coverage gate
 * and by each account's own smoke.
 *
 * A `4xx` is a pass: it means the handler ran and refused, which is exactly what
 * an unauthenticated or parameterless probe should get. Only a `5xx` — or a body
 * naming an unconfigured port — says the route could not run at all.
 */
const SERVICE_OWNERS = new Set([
  "control",
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
]);

interface OwnedRead {
  readonly owner: string;
  readonly route: string;
}

function ownedReads(): OwnedRead[] {
  const inventory = execFileSync("npx", ["tsx", "scripts/api-route-inventory.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const unshipped = new Set(KNOWN_UNSHIPPED);
  const shipped = new Map<string, Map<string, Set<string>>>();

  const reads: OwnedRead[] = [];
  for (const line of inventory.split("\n").filter(Boolean)) {
    const [method, route, owner] = line.split("\t");
    if (method !== "GET" || !owner || !SERVICE_OWNERS.has(owner)) continue;
    // A dynamic segment has no safe value to invent, and a wrong one is a
    // different question than the one this sweep asks.
    if (route!.includes("[")) continue;
    if (unshipped.has(`GET ${route}`)) continue;
    if (!shipped.has(owner)) shipped.set(owner, shippedRoutes(`services/${owner}`));
    if (!shipped.get(owner)!.get(route!)?.has("GET")) continue;
    reads.push({ owner, route: route! });
  }
  return reads;
}

/** A body that names an unconfigured port is a failure even behind a 200. */
function unconfiguredPorts(body: string): string[] {
  if (!body.includes("is not configured")) return [];
  return [...new Set([...body.matchAll(/[\w.]+ is not configured/g)].map((m) => m[0]))];
}

async function main(): Promise<void> {
  const reads = ownedReads();
  const failures: string[] = [];

  for (const { owner, route } of reads) {
    const origin = resolveDeployedOrigin(owner).origin;
    const url = `${origin}${route}`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
      const body = (await response.text()).slice(0, 300);

      if (response.status >= 500) {
        failures.push(
          `${owner} GET ${url}\n    HTTP ${response.status} — the handler could not run\n    body: ${body}`,
        );
        continue;
      }
      const ports = unconfiguredPorts(body);
      if (ports.length > 0) {
        failures.push(`${owner} GET ${url}\n    unconfigured port(s): ${ports.join(", ")}`);
        continue;
      }
      console.log(`[owned-reads] ${response.status} ${owner} GET ${route}`);
    } catch (error) {
      failures.push(
        `${owner} GET ${url}\n    ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(
      `\n[owned-reads] ${failures.length} of ${reads.length} owned read(s) failed.\n\n` +
        `${failures.join("\n\n")}\n\n` +
        "A 5xx here means the account owns the route but cannot serve it: a missing " +
        "port registration, a runtime the account cannot reach, or a credential it " +
        "does not hold. See docs/08-troubleshooting/problems/owned-route-not-shipped.md.",
    );
    process.exit(1);
  }

  console.log(
    `[owned-reads] All ${reads.length} owned read route(s) answered without a server fault.`,
  );
}

main().catch((error) => {
  console.error("[owned-reads] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
