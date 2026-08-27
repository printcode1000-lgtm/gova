#!/usr/bin/env tsx
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

import {
  bodyReportsUnconfiguredPort,
  SERVICE_SMOKE_PROBES,
  type ServiceSmokeProbe,
} from "./release-service-smoke-probes";
import {
  restoreServiceBuild,
  returnServiceBuild,
  serviceInputHash,
  serviceSmokeRebuildRequested,
} from "./service-build-cache";

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
 *
 * A service is built here whenever this gate has no build it can prove matches.
 * `services:build` now parks its output outside the service folder, keyed on a
 * content hash of the mirrored folder, and this gate starts that exact output
 * when the hash still matches — so a release builds each service once instead
 * of twice, and a mirror that changed in between is still rebuilt.
 *
 * The invariant that forced the rebuild is unchanged, and is why the output is
 * parked rather than left in place: the CLI uploads `services/<name>/`
 * verbatim, so no `.next` may exist there when this gate returns. The output is
 * moved in, probed, and moved back out in a `finally`. Running this gate alone,
 * with no preceding phase and no cache, behaves exactly as it always did.
 *
 * `--rebuild` (or `deploy:all --service-smoke-rebuild`) forces the old
 * build-every-time behavior.
 *
 * Probe definitions live in `release-service-smoke-probes.ts` so `smoke:deployed`
 * cannot drift from this table.
 */
type ServiceProbe = ServiceSmokeProbe;
const PROBES: readonly ServiceProbe[] = SERVICE_SMOKE_PROBES;

const BASE_PORT = Number(process.env.ASOL_SERVICE_SMOKE_PORT ?? 3310);
const STARTUP_TIMEOUT_MS = 90_000;

function buildService(service: string, serviceDir: string): void {
  const run = (command: string, args: string[]): void => {
    execFileSync(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      cwd: serviceDir,
    });
  };

  // Each service is its own project, not a workspace of the root, so a root
  // install leaves it without dependencies. This mirrors what Vercel does.
  if (!existsSync(path.join(serviceDir, "node_modules"))) {
    console.log(`[service-smoke] ${service}: installing dependencies...`);
    run("npm", ["ci", "--no-audit", "--no-fund"]);
  }

  console.log(`[service-smoke] ${service}: building...`);
  run("npx", ["next", "build"]);
}

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
  const serviceDir = path.join(process.cwd(), "services", probe.service);
  if (!existsSync(serviceDir)) {
    return `${probe.service}: services/${probe.service} is missing`;
  }

  const inputHash = serviceInputHash(process.cwd(), probe.service);
  const forceRebuild = serviceSmokeRebuildRequested();
  const reused = !forceRebuild && restoreServiceBuild(probe.service, serviceDir, inputHash);
  if (reused) {
    console.log(
      `[service-smoke] ${probe.service}: reusing the services:build output for this exact mirror.`,
    );
  } else {
    if (forceRebuild) {
      console.log(`[service-smoke] ${probe.service}: rebuild forced.`);
    }
    try {
      buildService(probe.service, serviceDir);
    } catch {
      return `${probe.service}: next build failed — see the output above.`;
    }
  }

  const log: string[] = [];
  const server = startService(probe.service, port);
  try {
    await waitForListening(server, port, log);

    const response = await fetch(`http://127.0.0.1:${port}${probe.path}`, {
      method: probe.method ?? "GET",
      headers: probe.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: probe.body === undefined ? undefined : JSON.stringify(probe.body),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.text()).slice(0, 200);

    if (!probe.accept.includes(response.status)) {
      // Print what the server said. A body of {"error":"internalServerError"}
      // names no cause, and diagnosing it by rebuilding the account by hand is
      // the slow path this gate exists to remove.
      const serverSaid = log
        .join("")
        .split("\n")
        .filter((line) => /error|Error|not configured|not available/.test(line))
        .slice(-3)
        .map((line) => `\n    server: ${line.trim().slice(0, 300)}`)
        .join("");
      return `${probe.service} ${probe.method ?? "GET"} ${probe.path}\n    HTTP ${response.status} — expected one of ${probe.accept.join(", ")}\n    body: ${body}${serverSaid}`;
    }

    // A route can answer while a port silently falls back to a default.
    const unconfigured = bodyReportsUnconfiguredPort(`${log.join("")}${body}`);
    if (unconfigured.length > 0) {
      return `${probe.service}: unconfigured port(s) while answering: ${unconfigured.join(", ")}`;
    }

    // Accepting a rejection blind is how a probe stops proving anything. When
    // the account answers with a 4xx, show the reason it gave, so a green run
    // still says which refusal it accepted.
    const reason =
      response.status >= 400
        ? log
            .join("")
            .split("\n")
            .filter((line) => line.includes("rejected before delivery") || line.includes("error"))
            .slice(-1)[0]
        : undefined;
    console.log(
      `[service-smoke] ${response.status} ${probe.service} ${probe.method ?? "GET"} ${probe.path}` +
        (reason ? `\n           reason: ${reason.trim().slice(0, 200)}` : ""),
    );
    return null;
  } catch (error) {
    return `${probe.service}: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    server.kill("SIGTERM");
    // Never leave a build directory inside a folder the CLI uploads verbatim.
    // Moved back to the cache rather than deleted, so a later step in the same
    // release can start it again without a third build.
    returnServiceBuild(probe.service, serviceDir, inputHash);
    rmSync(path.join(serviceDir, ".next"), { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const only = process.env.ASOL_SERVICE_SMOKE_ONLY?.split(",").map((v) => v.trim());
  const failures: string[] = [];
  for (const [index, probe] of PROBES.entries()) {
    if (only && !only.includes(probe.service)) continue;
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

  const ran = only ? PROBES.filter((p) => only.includes(p.service)).length : PROBES.length;
  console.log(`[service-smoke] All ${ran} service(s) answered a route that reaches their own data.`);
}

main().catch((error) => {
  console.error("[service-smoke] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
