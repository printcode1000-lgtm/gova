import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import net from "node:net";
import type { Duplex } from "node:stream";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  SIMULATION_ACTORS,
  SIMULATION_ACTOR_HEADER,
  SIMULATION_PROXY_SECRET_HEADER,
  SIMULATION_BACKEND_PORT,
  type SimulationActor,
} from "@asol/simulation-core";
import {
  readSimulationRuntimeState,
  resetSimulationRuntimeState,
  setSimulationEnabled,
} from "@asol/simulation-core/server";

const LOOPBACK = "127.0.0.1";
const LISTEN_HOST = LOOPBACK;
const proxySecret = randomBytes(32).toString("base64url");
const NORMAL_PORT = 3001;
const RUNTIME_METADATA_FILE = join(
  tmpdir(),
  "gova-live-simulation-runtime.json",
);
const smoke = process.argv.includes("--smoke");
const servers: http.Server[] = [];
let nextProcess: ChildProcess | null = null;
let shuttingDown = false;

function requestHostname(request: IncomingMessage): string {
  const host = request.headers.host ?? LOOPBACK;
  if (host.startsWith("[")) return host.slice(1, host.indexOf("]"));
  return host.split(":")[0] || LOOPBACK;
}
function normalDevelopmentUrl(request: IncomingMessage): string {
  const path = request.url?.startsWith("/") ? request.url : "/";
  return `http://${requestHostname(request)}:${NORMAL_PORT}${path}`;
}

function requestPathname(request: IncomingMessage): string {
  try {
    return new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? LOOPBACK}`,
    ).pathname;
  } catch {
    return "/";
  }
}

function isTrustedActorMutationOrigin(
  request: IncomingMessage,
  actor: SimulationActor,
): boolean {
  if (
    request.method !== "POST" ||
    !requestPathname(request).startsWith("/api/dev/simulation/")
  ) {
    return true;
  }
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === "http:" &&
      parsed.host === host &&
      Number(parsed.port) === actor.port
    );
  } catch {
    return false;
  }
}

function sanitizedHeaders(request: IncomingMessage): http.IncomingHttpHeaders {
  const headers = { ...request.headers };
  delete headers[SIMULATION_ACTOR_HEADER];
  delete headers[SIMULATION_PROXY_SECRET_HEADER];
  return headers;
}

function proxyHeaders(
  request: IncomingMessage,
  actor: SimulationActor,
): http.OutgoingHttpHeaders {
  return {
    ...sanitizedHeaders(request),
    host: request.headers.host,
    [SIMULATION_ACTOR_HEADER]: actor.key,
    [SIMULATION_PROXY_SECRET_HEADER]: proxySecret,
    "x-forwarded-host": request.headers.host ?? "",
    "x-forwarded-port": String(actor.port),
    "x-forwarded-proto": "http",
  };
}

function proxyHttp(
  request: IncomingMessage,
  response: ServerResponse,
  actor: SimulationActor,
): void {
  const upstream = http.request(
    {
      hostname: LOOPBACK,
      port: SIMULATION_BACKEND_PORT,
      method: request.method,
      path: request.url,
      headers: proxyHeaders(request, actor),
    },
    (upstreamResponse) => {
      response.writeHead(
        upstreamResponse.statusCode ?? 502,
        upstreamResponse.headers,
      );
      upstreamResponse.pipe(response);
    },
  );
  upstream.on("error", (error) => {
    if (!response.headersSent)
      response.writeHead(502, { "content-type": "text/plain" });
    response.end(`simulation upstream unavailable: ${error.message}`);
  });
  request.pipe(upstream);
}

function rejectUpgrade(socket: Duplex, location: string): void {
  socket.end(
    `HTTP/1.1 307 Temporary Redirect\r\nLocation: ${location}\r\nConnection: close\r\n\r\n`,
  );
}

function proxyUpgrade(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  actor: SimulationActor,
): void {
  const upstream = net.connect(SIMULATION_BACKEND_PORT, LOOPBACK, () => {
    const headers = {
      ...sanitizedHeaders(request),
      [SIMULATION_ACTOR_HEADER]: actor.key,
      [SIMULATION_PROXY_SECRET_HEADER]: proxySecret,
    };
    const lines = [
      `${request.method ?? "GET"} ${request.url ?? "/"} HTTP/${request.httpVersion}`,
    ];
    for (const [name, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      lines.push(`${name}: ${Array.isArray(value) ? value.join(", ") : value}`);
    }
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head.length > 0) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
}
function proxyNormalHttp(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const upstream = http.request(
    {
      hostname: LOOPBACK,
      port: SIMULATION_BACKEND_PORT,
      method: request.method,
      path: request.url,
      headers: {
        ...sanitizedHeaders(request),
        [SIMULATION_PROXY_SECRET_HEADER]: proxySecret,
        host: request.headers.host,
        "x-forwarded-host": request.headers.host ?? "",
        "x-forwarded-port": String(NORMAL_PORT),
        "x-forwarded-proto": "http",
      },
    },
    (upstreamResponse) => {
      response.writeHead(
        upstreamResponse.statusCode ?? 502,
        upstreamResponse.headers,
      );
      upstreamResponse.pipe(response);
    },
  );
  upstream.on("error", (error) => {
    if (!response.headersSent)
      response.writeHead(502, { "content-type": "text/plain" });
    response.end(`simulation upstream unavailable: ${error.message}`);
  });
  request.pipe(upstream);
}

function proxyNormalUpgrade(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): void {
  const upstream = net.connect(SIMULATION_BACKEND_PORT, LOOPBACK, () => {
    const lines = [
      `${request.method ?? "GET"} ${request.url ?? "/"} HTTP/${request.httpVersion}`,
    ];
    const headers = {
      ...sanitizedHeaders(request),
      [SIMULATION_PROXY_SECRET_HEADER]: proxySecret,
    };
    for (const [name, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      lines.push(`${name}: ${Array.isArray(value) ? value.join(", ") : value}`);
    }
    upstream.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head.length > 0) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
}

function createNormalServer(): http.Server {
  const server = http.createServer(proxyNormalHttp);
  server.on("upgrade", proxyNormalUpgrade);
  return server;
}

function createActorServer(actor: SimulationActor): http.Server {
  const server = http.createServer((request, response) => {
    if (!readSimulationRuntimeState().enabled) {
      // A stale actor tab can still finish background API work after the Super Admin
      // turns simulation off. Redirecting that API request to port 3001 changes the
      // browser origin (for example 3010 -> 3001), which forces a CORS preflight and
      // turns an otherwise healthy Business API request into NetworkUnavailableError.
      // Keep API traffic on the actor origin and proxy it as ordinary development
      // traffic with no actor identity. Page navigations still return to port 3001.
      if (requestPathname(request).startsWith("/api/")) {
        proxyNormalHttp(request, response);
        return;
      }
      response.writeHead(307, {
        location: normalDevelopmentUrl(request),
        "cache-control": "no-store",
      });
      response.end();
      return;
    }
    if (!isTrustedActorMutationOrigin(request, actor)) {
      response.writeHead(403, {
        "content-type": "text/plain",
        "cache-control": "no-store",
      });
      response.end("forbidden");
      return;
    }
    proxyHttp(request, response, actor);
  });

  server.on("upgrade", (request, socket, head) => {
    if (!readSimulationRuntimeState().enabled) {
      rejectUpgrade(socket, normalDevelopmentUrl(request));
      return;
    }
    proxyUpgrade(request, socket, head, actor);
  });
  return server;
}

async function waitForBackend(timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(
        `http://${LOOPBACK}:${SIMULATION_BACKEND_PORT}/api/health`,
        {
          signal: AbortSignal.timeout(2_000),
        },
      );
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Next.js simulation backend did not become ready on ${SIMULATION_BACKEND_PORT}`,
  );
}
async function listen(server: http.Server, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, LISTEN_HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

type RuntimeMetadata = {
  launcherPid: number;
  nextGroupPid: number;
  cwd: string;
  backendPort: number;
  updatedAt: string;
};

function removeRuntimeMetadata(): void {
  try {
    unlinkSync(RUNTIME_METADATA_FILE);
  } catch {}
}

function processGroupExists(groupPid: number): boolean {
  if (process.platform === "win32") return false;
  try {
    process.kill(-groupPid, 0);
    return true;
  } catch {
    return false;
  }
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readRuntimeMetadata(): RuntimeMetadata | null {
  try {
    return JSON.parse(
      readFileSync(RUNTIME_METADATA_FILE, "utf8"),
    ) as RuntimeMetadata;
  } catch {
    return null;
  }
}

async function cleanupStaleRuntime(): Promise<void> {
  const stale = readRuntimeMetadata();
  if (!stale) return;
  if (stale.launcherPid !== process.pid && processExists(stale.launcherPid)) {
    throw new Error(
      `simulation runtime already active (pid ${stale.launcherPid})`,
    );
  }
  if (
    process.platform !== "win32" &&
    stale.cwd === process.cwd() &&
    stale.backendPort === SIMULATION_BACKEND_PORT &&
    processGroupExists(stale.nextGroupPid)
  ) {
    let cmdline = "";
    try {
      cmdline = readFileSync(`/proc/${stale.nextGroupPid}/cmdline`, "utf8");
    } catch {}
    if (
      cmdline.includes("next") &&
      cmdline.includes(String(SIMULATION_BACKEND_PORT))
    ) {
      try {
        process.kill(-stale.nextGroupPid, "SIGTERM");
      } catch {}
      const deadline = Date.now() + 3_000;
      while (Date.now() < deadline && processGroupExists(stale.nextGroupPid)) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (processGroupExists(stale.nextGroupPid)) {
        try {
          process.kill(-stale.nextGroupPid, "SIGKILL");
        } catch {}
      }
    }
  }
  removeRuntimeMetadata();
}

function writeRuntimeMetadata(nextGroupPid: number): void {
  writeFileSync(
    RUNTIME_METADATA_FILE,
    JSON.stringify({
      launcherPid: process.pid,
      nextGroupPid,
      cwd: process.cwd(),
      backendPort: SIMULATION_BACKEND_PORT,
      updatedAt: new Date().toISOString(),
    }),
    { mode: 0o600 },
  );
}

function signalNextProcess(signal: NodeJS.Signals): void {
  if (!nextProcess?.pid || nextProcess.exitCode !== null) return;
  try {
    if (process.platform !== "win32") process.kill(-nextProcess.pid, signal);
    else nextProcess.kill(signal);
  } catch {
    try {
      nextProcess.kill(signal);
    } catch {}
  }
}

async function stopNextProcess(): Promise<void> {
  if (!nextProcess || nextProcess.exitCode !== null) return;
  const child = nextProcess;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    child.once("exit", finish);
    signalNextProcess("SIGTERM");
    const timer = setTimeout(() => {
      signalNextProcess("SIGKILL");
      finish();
    }, 4_000);
    child.once("exit", () => clearTimeout(timer));
  });
}

async function closeHttpServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    server.close(finish);
    server.closeIdleConnections?.();
    setTimeout(() => {
      server.closeAllConnections?.();
      finish();
    }, 500).unref();
  });
}

async function shutdown(exitCode = 0): Promise<never> {
  if (shuttingDown) process.exit(exitCode);
  shuttingDown = true;
  resetSimulationRuntimeState();
  await Promise.all(servers.map(closeHttpServer));
  await stopNextProcess();
  removeRuntimeMetadata();
  process.exit(exitCode);
}

async function runSmoke(): Promise<void> {
  const normal = await fetch(`http://${LOOPBACK}:${NORMAL_PORT}/api/health`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!normal.ok)
    throw new Error(`normal development failed health probe: ${normal.status}`);

  setSimulationEnabled(true);
  const directSessionAttempt = await fetch(
    `http://${LOOPBACK}:${SIMULATION_BACKEND_PORT}/api/dev/simulation/session`,
    {
      method: "POST",
      headers: { [SIMULATION_ACTOR_HEADER]: "buyer-01" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (directSessionAttempt.ok) {
    throw new Error(
      "direct backend must reject unsigned simulation actor headers",
    );
  }

  const buyer = SIMULATION_ACTORS[0];
  const crossOriginSessionAttempt = await fetch(
    `http://${LOOPBACK}:${buyer.port}/api/dev/simulation/session`,
    {
      method: "POST",
      headers: { origin: "https://cross-origin.invalid" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (crossOriginSessionAttempt.status !== 403) {
    throw new Error(
      `cross-origin actor session bootstrap must be 403, got ${crossOriginSessionAttempt.status}`,
    );
  }

  const validActorSession = await fetch(
    `http://${LOOPBACK}:${buyer.port}/api/dev/simulation/session`,
    {
      method: "POST",
      headers: { origin: `http://${LOOPBACK}:${buyer.port}` },
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!validActorSession.ok) {
    throw new Error(
      `same-origin actor session bootstrap failed: ${validActorSession.status}`,
    );
  }

  for (const actor of SIMULATION_ACTORS) {
    const response = await fetch(
      `http://${LOOPBACK}:${actor.port}/api/health`,
      {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok)
      throw new Error(
        `actor ${actor.key} failed health probe: ${response.status}`,
      );
  }

  setSimulationEnabled(false);
  const disabledActorApi = await fetch(
    `http://${LOOPBACK}:${SIMULATION_ACTORS[0].port}/api/health`,
    { redirect: "manual" },
  );
  if (!disabledActorApi.ok) {
    throw new Error(
      `disabled actor API must proxy without a cross-port redirect, got ${disabledActorApi.status}`,
    );
  }

  const disabledProfileApi = await fetch(
    `http://${LOOPBACK}:${SIMULATION_ACTORS[0].port}/api/profile/store-details?uid=usr_sim_buyer_01`,
    { redirect: "manual" },
  );
  const profileLocation = disabledProfileApi.headers.get("location") ?? "";
  if (disabledProfileApi.status !== 307 || profileLocation.includes(`:${NORMAL_PORT}/`)) {
    throw new Error(
      `disabled actor Business API must bypass port ${NORMAL_PORT}; got ${disabledProfileApi.status} ${profileLocation}`,
    );
  }

  const redirected = await fetch(
    `http://${LOOPBACK}:${SIMULATION_ACTORS[0].port}/home`,
    { redirect: "manual" },
  );
  if (redirected.status !== 307) {
    throw new Error(
      `disabled actor page must redirect to normal development, got ${redirected.status}`,
    );
  }
  const location = redirected.headers.get("location") ?? "";
  if (!location.includes(`:${NORMAL_PORT}/home`)) {
    throw new Error(
      `disabled actor page redirect must target port ${NORMAL_PORT}, got ${location}`,
    );
  }
}

async function main(): Promise<void> {
  await cleanupStaleRuntime();
  resetSimulationRuntimeState();
  const nextBin = join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  nextProcess = spawn(
    process.execPath,
    [
      nextBin,
      "dev",
      "--turbo",
      "--hostname",
      LOOPBACK,
      "--port",
      String(SIMULATION_BACKEND_PORT),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ASOL_SIMULATION_RUNTIME: "1",
        ASOL_SIMULATION_PROXY_SECRET: proxySecret,
      },
      stdio: "inherit",
      detached: process.platform !== "win32",
    },
  );
  if (!nextProcess.pid)
    throw new Error("simulation backend process pid unavailable");
  writeRuntimeMetadata(nextProcess.pid);
  nextProcess.on("exit", (code) => {
    if (!shuttingDown) void shutdown(code ?? 1);
  });

  await waitForBackend();
  const normalServer = createNormalServer();
  await listen(normalServer, NORMAL_PORT);
  servers.push(normalServer);

  for (const actor of SIMULATION_ACTORS) {
    const server = createActorServer(actor);
    await listen(server, actor.port);
    servers.push(server);
  }

  console.log(
    `[simulation] normal development: http://${LOOPBACK}:${NORMAL_PORT}`,
  );
  console.log(
    `[simulation] internal Next.js backend: http://${LOOPBACK}:${SIMULATION_BACKEND_PORT}`,
  );
  console.log(
    "[simulation] actor origins: 3002..3011 (disabled until Super Admin switch is ON)",
  );

  if (smoke) {
    await runSmoke();
    console.log("✅ dev:simulation smoke passed");
    await shutdown(0);
  }
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));
main().catch((error) => {
  console.error(
    "❌ dev:simulation failed:",
    error instanceof Error ? error.message : error,
  );
  void shutdown(1);
});
