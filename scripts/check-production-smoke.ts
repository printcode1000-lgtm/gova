#!/usr/bin/env tsx
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Start the built server and ask it real questions.
 *
 * Nothing in this repository did that. `deploy:all` builds, uploads and polls
 * Vercel until it answers READY — but READY means the deployment exists, not
 * that a request succeeds. It reported seven targets READY while every server
 * route answered 500.
 *
 * The fault was a bundler giving `data-core`'s runtime-config port two module
 * instances: `instrumentation` configured one, route handlers read the other,
 * and every route died on `getServerRuntimeContext is not configured`.
 * `typecheck`, `architecture:check`, the full suite and the
 * import-without-composition contract were all green throughout, because Node
 * resolves one path to one instance. The duplication exists only in a bundled
 * build, so no static analysis and no `tsx` test can reach it.
 *
 * The only thing that can is a real server answering a real request. This runs
 * between the server build and the static build, so a bundling fault stops the
 * release before the deployment commit exists.
 *
 * Routes are chosen to cross composition roots, not to cover features: each one
 * reaches a different capability package through a different port, so a
 * registration that fails to arrive shows up here rather than in production.
 * They are read-only and safe to call repeatedly.
 */
const PORT = Number(process.env.ASOL_SMOKE_PORT ?? 3210);
const BASE = `http://127.0.0.1:${PORT}`;
const STARTUP_TIMEOUT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 30_000;

interface SmokeRoute {
  readonly path: string;
  /** Which port registration this request proves arrived. */
  readonly proves: string;
  /** Codes that mean the handler ran. 401/403/404 are answers, not failures. */
  readonly accept: readonly number[];
}

const ROUTES: readonly SmokeRoute[] = [
  {
    path: "/api/health",
    proves: "the server is up",
    accept: [200],
  },
  {
    path: "/api/profile/store-details?uid=asol_smoke_probe",
    proves: "data-core runtime config + profile shard routing",
    accept: [200, 400, 404],
  },
  {
    path: "/api/notifications/preferences?uid=asol_smoke_probe&phone=+200000000000",
    proves: "notifications-core server config + notifications shard",
    accept: [200, 400, 403, 404],
  },
  {
    path: "/api/products?limit=1",
    proves: "product capability through its own data source",
    accept: [200, 400],
  },
  {
    path: "/api/system-logs",
    proves: "system-logs-core port and observability wiring",
    accept: [200, 401, 403],
  },
];

function startServer(): ChildProcess {
  const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  return spawn(process.execPath, [next, "start", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForReady(server: ChildProcess, log: string[]): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  server.stdout?.on("data", (chunk: Buffer) => log.push(chunk.toString()));
  server.stderr?.on("data", (chunk: Buffer) => log.push(chunk.toString()));

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (response.status > 0) return;
    } catch {
      // Not listening yet.
    }
    if (server.exitCode !== null) {
      throw new Error(`The server exited before accepting requests.\n${log.join("")}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`The server did not accept a request within ${STARTUP_TIMEOUT_MS / 1000}s.`);
}

async function main(): Promise<void> {
  if (!existsSync(path.join(process.cwd(), ".next"))) {
    console.error("[smoke] No build output. Run `npm run build` first.");
    process.exit(1);
  }

  const log: string[] = [];
  const server = startServer();
  const failures: string[] = [];

  try {
    await waitForReady(server, log);

    for (const route of ROUTES) {
      let status = 0;
      let body = "";
      try {
        const response = await fetch(`${BASE}${route.path}`, {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        status = response.status;
        body = (await response.text()).slice(0, 200);
      } catch (error) {
        failures.push(
          `${route.path}\n    no response (${error instanceof Error ? error.message : String(error)})\n    proves: ${route.proves}`,
        );
        continue;
      }

      if (route.accept.includes(status)) {
        console.log(`[smoke] ${status} ${route.path}`);
        continue;
      }
      failures.push(
        `${route.path}\n    HTTP ${status} — expected one of ${route.accept.join(", ")}\n    proves: ${route.proves}\n    body: ${body}`,
      );
    }

    // A route can answer 200 while a port quietly falls back to a default, so
    // the server's own output is part of the check.
    const output = log.join("");
    const unconfigured = [...output.matchAll(/([\w.]+) is not configured/g)].map((m) => m[0]);
    if (unconfigured.length > 0) {
      failures.push(
        `The server reported unconfigured ports while answering: ${[...new Set(unconfigured)].join(", ")}`,
      );
    }
  } finally {
    server.kill("SIGTERM");
  }

  if (failures.length > 0) {
    console.error(
      `\n[smoke] The built server failed to answer ${failures.length} check(s).\n\n${failures.join("\n\n")}\n\n` +
        "A port resolved per module instance is the usual cause: a bundler may give one module two instances, so a composition root configures one and the routes read the other. Key the registration on globalThis, not module scope.",
    );
    process.exit(1);
  }

  console.log(`[smoke] The built server answered all ${ROUTES.length} checks.`);
}

main().catch((error) => {
  console.error("[smoke] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
