import { spawn } from "node:child_process";
import {
  DIRECT_BOOTSTRAP_POLL_MS,
  DIRECT_DISCOVERY_REFRESH_MS,
  DirectAgentServer,
  ReplayCache,
  SessionStore,
  directDaemonStateIsLive,
  hostIdentifier,
  loadOrCreateHostIdentityKey,
  readDirectDaemonState,
  resolveDirectAgentPort,
  writeDirectDaemonState,
  type DirectDaemonState,
} from "@asol/local-agent-core/direct";
import { loadOtaEnvironment } from "@asol/ota-core/publishing";
import { runDirectBootstrapCycle } from "./local-agent-direct-bootstrap";

loadOtaEnvironment();
const hostId = hostIdentifier();
const port = resolveDirectAgentPort();
const identity = loadOrCreateHostIdentityKey();
const sessionStore = new SessionStore();
const replayCache = new ReplayCache();
const server = new DirectAgentServer({ port, bindHost: "0.0.0.0", sessionStore, replayCache });
const startedAt = new Date().toISOString();
let stopping = false;
let discoveryLastPublishedAt: string | null = null;
let bootstrapLastCycleAt: string | null = null;
let lastError: string | null = null;
let bootstrapBusy = false;
let discoveryBusy = false;

function state(): DirectDaemonState {
  return {
    schemaVersion: 1,
    pid: process.pid,
    running: !stopping,
    hostId,
    port,
    bindHost: "0.0.0.0",
    serverKeyId: identity.serverKeyId,
    startedAt,
    updatedAt: new Date().toISOString(),
    discoveryLastPublishedAt,
    bootstrapLastCycleAt,
    lastError,
  };
}
function persist(): void { writeDirectDaemonState(state()); }

async function refreshDiscovery(): Promise<void> {
  if (discoveryBusy || stopping) return;
  discoveryBusy = true;
  await new Promise<void>((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/local-agent-device-discovery.ts", "--publish-only"], {
      cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";
    child.stderr?.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("close", (code) => {
      if (code === 0) { discoveryLastPublishedAt = new Date().toISOString(); lastError = null; }
      else { lastError = `discovery-refresh-failed:${code}:${stderr.trim().slice(0, 300)}`; }
      discoveryBusy = false; persist(); resolve();
    });
    child.on("error", (error) => { lastError = `discovery-refresh-error:${error.message}`; discoveryBusy = false; persist(); resolve(); });
  });
}

async function bootstrapCycle(): Promise<void> {
  if (bootstrapBusy || stopping) return;
  bootstrapBusy = true;
  try { await runDirectBootstrapCycle(); bootstrapLastCycleAt = new Date().toISOString(); lastError = null; }
  catch (error) { lastError = `bootstrap-cycle:${error instanceof Error ? error.message : String(error)}`; }
  finally { bootstrapBusy = false; persist(); }
}

async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true; lastError = `shutdown:${signal}`; persist();
  clearInterval(bootstrapTimer); clearInterval(discoveryTimer); clearInterval(stateTimer);
  await server.stop();
  persist();
  process.exit(0);
}

const previous = readDirectDaemonState();
if (directDaemonStateIsLive(previous) && previous?.pid !== process.pid) {
  throw new Error(`Direct daemon already running with pid ${previous?.pid}.`);
}
await server.start();
persist();
console.log(JSON.stringify({ event: "direct-daemon-started", hostId, port, pid: process.pid, serverKeyId: identity.serverKeyId }));
await Promise.all([refreshDiscovery(), bootstrapCycle()]);
const bootstrapTimer = setInterval(() => { void bootstrapCycle(); }, DIRECT_BOOTSTRAP_POLL_MS);
const discoveryTimer = setInterval(() => { void refreshDiscovery(); }, DIRECT_DISCOVERY_REFRESH_MS);
const stateTimer = setInterval(persist, 30_000);
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"] as const) process.once(signal, () => { void shutdown(signal); });
