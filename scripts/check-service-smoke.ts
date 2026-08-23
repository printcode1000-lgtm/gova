#!/usr/bin/env tsx
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Start each isolated service's build and ask it a real question.
 *
 * `smoke:production` covers the main application. The services were the half
 * that actually broke: none of their composition roots registered
 * `@asol/data-core`'s runtime-config port, so every route that reached a
 * repository answered 500 while `/api/health` stayed 200 — health touches no
 * shard. `deploy:all` reported all six READY and the profiles account was
 * serving errors to the browser the whole time.
 *
 * Health is therefore explicitly not enough. Each service is asked for a route
 * that reaches its own data, which is the only thing that proves its ports were
 * wired.
 *
 * Runs after `services:build`, so a missing registration stops the release
 * before any account is published.
 */
interface ServiceProbe {
  readonly service: string;
  /** A route that reaches this account's own repositories. */
  readonly path: string;
  /** Codes meaning the handler ran. 400/401/403/404/405 are answers. */
  readonly accept: readonly number[];
}

const PROBES: readonly ServiceProbe[] = [
  {
    service: "profiles",
    path: "/api/profile/store-details?uid=asol_smoke_probe",
    accept: [200, 400, 404],
  },
  {
    service: "products",
    path: "/api/products?limit=1",
    accept: [200, 400],
  },
  {
    service: "orders",
    path: "/api/orders?uid=asol_smoke_probe&phone=%2B200000000000&limit=1&offset=0",
    accept: [200, 400, 401, 403, 404],
  },
  {
    service: "notifications",
    path: "/api/notifications/preferences?uid=asol_smoke_probe&phone=%2B200000000000",
    accept: [200, 400, 403, 404],
  },
  {
    service: "submain",
    path: "/api/search/products?q=probe&categoryId=1&limit=1",
    accept: [200, 400],
  },
  {
    // sub2main serves writes only; GET is a routing answer, not a failure. It
    // still proves the process booted and its ports registered without throwing.
    service: "sub2main",
    path: "/api/profile/store-details?uid=asol_smoke_probe",
    accept: [200, 400, 404, 405],
  },
];

const BASE_PORT = Number(process.env.ASOL_SERVICE_SMOKE_PORT ?? 3310);
const STARTUP_TIMEOUT_MS = 90_000;

function startService(service: string, port: number): ChildProcess {
  const next = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  return spawn(process.execPath, [next, "start", "-p", String(port)], {
    cwd: path.join(process.cwd(), "services", service),
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForListening(server: ChildProcess, port: number, log: string[]): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  server.stdout?.on("data", (c: Buffer) => log.push(c.toString()));
  server.stderr?.on("data", (c: Buffer) => log.push(c.toString()));

  while (Date.now() < deadline) {
    try {
      await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(3_000) });
      return;
    } catch {
      // not listening yet
    }
    if (server.exitCode !== null) {
      throw new Error(`exited before listening\n${log.join("")}`);
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`did not listen within ${STARTUP_TIMEOUT_MS / 1000}s`);
}

async function probeService(probe: ServiceProbe, port: number): Promise<string | null> {
  const built = path.join(process.cwd(), "services", probe.service, ".next");
  if (!existsSync(built)) {
    return `${probe.service}: no build output at services/${probe.service}/.next — run services:build first.`;
  }

  const log: string[] = [];
  const server = startService(probe.service, port);
  try {
    await waitForListening(server, port, log);

    const response = await fetch(`http://127.0.0.1:${port}${probe.path}`, {
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.text()).slice(0, 200);

    if (!probe.accept.includes(response.status)) {
      return `${probe.service}${probe.path}\n    HTTP ${response.status} — expected one of ${probe.accept.join(", ")}\n    body: ${body}`;
    }

    // A route can answer while a port silently falls back to a default.
    const unconfigured = [...`${log.join("")}${body}`.matchAll(/[\w.]+ is not configured/g)].map(
      (m) => m[0],
    );
    if (unconfigured.length > 0) {
      return `${probe.service}: unconfigured port(s) while answering: ${[...new Set(unconfigured)].join(", ")}`;
    }

    console.log(`[service-smoke] ${response.status} ${probe.service}${probe.path}`);
    return null;
  } catch (error) {
    return `${probe.service}: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    server.kill("SIGTERM");
  }
}

async function main(): Promise<void> {
  const failures: string[] = [];
  for (const [index, probe] of PROBES.entries()) {
    const failure = await probeService(probe, BASE_PORT + index);
    if (failure) failures.push(failure);
  }

  if (failures.length > 0) {
    console.error(
      `\n[service-smoke] ${failures.length} service(s) failed to answer.\n\n${failures.join("\n\n")}\n\n` +
        "A composition root that never registers its ports is the usual cause: an isolated deployment has no application instrumentation, so nothing configures them and every route that reaches a repository throws while /api/health stays 200.",
    );
    process.exit(1);
  }

  console.log(`[service-smoke] All ${PROBES.length} services answered a route that reaches their own data.`);
}

main().catch((error) => {
  console.error("[service-smoke] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
