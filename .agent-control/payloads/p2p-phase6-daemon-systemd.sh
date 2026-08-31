#!/usr/bin/env bash
set -euo pipefail

cat > packages/local-agent-core/src/direct/runtime.ts <<'EOF'
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureDirectDir, DIRECT_FILE_MODE, directAgentDir, directStatePath } from "./paths";

export interface DirectDaemonState {
  schemaVersion: 1;
  pid: number;
  running: boolean;
  hostId: string;
  port: number;
  bindHost: string;
  serverKeyId: string;
  startedAt: string;
  updatedAt: string;
  discoveryLastPublishedAt: string | null;
  bootstrapLastCycleAt: string | null;
  lastError: string | null;
}

export function writeDirectDaemonState(state: DirectDaemonState): void {
  ensureDirectDir(directAgentDir());
  writeFileSync(directStatePath(), `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: DIRECT_FILE_MODE });
}

export function readDirectDaemonState(): DirectDaemonState | null {
  if (!existsSync(directStatePath())) return null;
  try {
    return JSON.parse(readFileSync(directStatePath(), "utf8")) as DirectDaemonState;
  } catch {
    return null;
  }
}

export function directProcessIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function directDaemonStateIsLive(state: DirectDaemonState | null): boolean {
  return Boolean(state?.running && directProcessIsAlive(state.pid));
}

export const DIRECT_SYSTEMD_UNIT_NAME = "gova-direct-agent.service";
export const DIRECT_DISCOVERY_REFRESH_MS = 3 * 60 * 1000;
export const DIRECT_BOOTSTRAP_POLL_MS = 5 * 1000;

export function renderDirectSystemdUnit(workspace: string, envFile: string): string {
  const escapedWorkspace = workspace.replace(/'/g, "'\\''");
  return `[Unit]\nDescription=Gova Direct P2P Agent\nAfter=network-online.target\nWants=network-online.target\n\n[Service]\nType=simple\nWorkingDirectory=${workspace}\nEnvironment=GOVA_LOCAL_WORKSPACE=${workspace}\nEnvironmentFile=-${envFile}\nExecStart=/usr/bin/bash -lc 'cd ${escapedWorkspace} && exec npm run -s local-agent:direct:daemon'\nRestart=on-failure\nRestartSec=5s\nTimeoutStopSec=20s\nKillMode=mixed\nNoNewPrivileges=false\n\n[Install]\nWantedBy=default.target\n`;
}
EOF

# Export runtime module.
grep -q '"./runtime"' packages/local-agent-core/src/direct/index.ts || cat >> packages/local-agent-core/src/direct/index.ts <<'EOF'
export * from "./runtime";
EOF

# Make bootstrap cycle reusable by the long-running daemon.
python3 - <<'PY'
from pathlib import Path
p=Path('scripts/local-agent-direct-bootstrap.ts')
s=p.read_text()
s=s.replace('async function cycle(): Promise<number> {', 'export async function runDirectBootstrapCycle(): Promise<number> {')
s=s.replace('try { await cycle(); } catch (error) {', 'try { await runDirectBootstrapCycle(); } catch (error) {')
# Prevent main() from executing when imported by daemon.
old='main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });\n'
new='if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {\n  main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });\n}\n'
if old not in s:
    raise SystemExit('bootstrap main footer not found')
s=s.replace(old,new)
p.write_text(s)
PY

cat > scripts/local-agent-direct-daemon.ts <<'EOF'
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
EOF

cat > scripts/local-agent-direct-cli.ts <<'EOF'
import { createConnection } from "node:net";
import { execFileSync } from "node:child_process";
import {
  DIRECT_SYSTEMD_UNIT_NAME,
  SessionStore,
  directDaemonStateIsLive,
  loadOrCreateHostIdentityKey,
  readDirectDaemonState,
  rotateHostIdentityKey,
} from "@asol/local-agent-core/direct";

function systemctl(args: string[], quiet = false): string {
  try { return execFileSync("systemctl", ["--user", ...args], { encoding: "utf8", stdio: quiet ? ["ignore", "pipe", "pipe"] : undefined }).trim(); }
  catch (error) { if (quiet) return ""; throw error; }
}
function serviceStatus(): { active: boolean; enabled: boolean; raw: string } {
  return { active: systemctl(["is-active", DIRECT_SYSTEMD_UNIT_NAME], true) === "active", enabled: systemctl(["is-enabled", DIRECT_SYSTEMD_UNIT_NAME], true) === "enabled", raw: systemctl(["show", DIRECT_SYSTEMD_UNIT_NAME, "-p", "ActiveState", "-p", "SubState", "-p", "MainPID"], true) };
}
async function portReachable(port: number): Promise<boolean> {
  return new Promise((resolve) => { const s=createConnection({host:"127.0.0.1",port}); const done=(v:boolean)=>{s.destroy();resolve(v)}; s.setTimeout(1200); s.once("connect",()=>done(true)); s.once("error",()=>done(false)); s.once("timeout",()=>done(false)); });
}
async function main(): Promise<void> {
  const [command, arg] = process.argv.slice(2);
  const sessions = new SessionStore();
  if (command === "status" || !command) {
    const state=readDirectDaemonState(); console.log(JSON.stringify({ state, live: directDaemonStateIsLive(state), service: serviceStatus(), activeSessions:sessions.listActiveSessions().length },null,2)); return;
  }
  if (command === "doctor") {
    const state=readDirectDaemonState(); const service=serviceStatus(); const reachable=state ? await portReachable(state.port) : false;
    const checks={statePresent:Boolean(state),processLive:directDaemonStateIsLive(state),serviceActive:service.active,serviceEnabled:service.enabled,portReachable:reachable,identityPresent:Boolean(loadOrCreateHostIdentityKey().serverKeyId),discoveryFresh:Boolean(state?.discoveryLastPublishedAt && Date.now()-Date.parse(state.discoveryLastPublishedAt)<10*60*1000)};
    const ok=Object.values(checks).every(Boolean); console.log(JSON.stringify({ok,checks,state,service},null,2)); if(!ok)process.exitCode=1; return;
  }
  if (command === "sessions") { console.log(JSON.stringify({active:sessions.listActiveSessions(),revoked:sessions.listRevokedSessions()},null,2)); return; }
  if (command === "revoke") { if(!arg)throw new Error("session id required"); console.log(JSON.stringify({revoked:sessions.revokeSession(arg,"CLI revocation")})); return; }
  if (command === "revoke-all") { console.log(JSON.stringify({revoked:sessions.revokeAllSessions("CLI revoke-all")})); return; }
  if (command === "key-status") { const key=loadOrCreateHostIdentityKey(); console.log(JSON.stringify({serverKeyId:key.serverKeyId,publicKeyPresent:Boolean(key.publicKeyPem),privateKeyPresent:true,createdAt:key.createdAt},null,2)); return; }
  if (command === "key-rotate") { sessions.revokeAllSessions("Host identity rotated"); const key=rotateHostIdentityKey(); console.log(JSON.stringify({rotated:true,serverKeyId:key.serverKeyId,sessionsRevoked:true},null,2)); return; }
  if (command === "start" || command === "stop" || command === "restart") { systemctl([command, DIRECT_SYSTEMD_UNIT_NAME]); console.log(JSON.stringify({command,service:DIRECT_SYSTEMD_UNIT_NAME,ok:true})); return; }
  if (command === "kill-switch") { sessions.revokeAllSessions("Kill switch"); systemctl(["disable","--now",DIRECT_SYSTEMD_UNIT_NAME]); console.log(JSON.stringify({killSwitch:true,serviceDisabled:true,sessionsRevoked:true})); return; }
  throw new Error(`unknown command: ${command}`);
}
main().catch((e)=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1});
EOF

cat > scripts/install-local-agent-direct-service.ts <<'EOF'
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DIRECT_SYSTEMD_UNIT_NAME, directAgentDir, ensureDirectDir, renderDirectSystemdUnit } from "@asol/local-agent-core/direct";

const workspace=path.resolve(process.env.GOVA_LOCAL_WORKSPACE || process.cwd());
const unitDir=path.join(homedir(),".config","systemd","user");
const unitPath=path.join(unitDir,DIRECT_SYSTEMD_UNIT_NAME);
const envFile=path.join(ensureDirectDir(directAgentDir()),"service.env");
mkdirSync(unitDir,{recursive:true});
if(!existsSync(envFile)){
  const password=process.env.ASOL_DEVICE_DISCOVERY_PORT_PASSWORD || randomBytes(32).toString("base64url");
  writeFileSync(envFile,`ASOL_DEVICE_DISCOVERY_PORT_PASSWORD=${password}\n`,{encoding:"utf8",mode:0o600}); chmodSync(envFile,0o600);
}else{
  chmodSync(envFile,0o600);
  const current=readFileSync(envFile,"utf8");
  if(!/^ASOL_DEVICE_DISCOVERY_PORT_PASSWORD=/m.test(current)) throw new Error(`Existing ${envFile} lacks ASOL_DEVICE_DISCOVERY_PORT_PASSWORD; refusing to overwrite machine-local configuration.`);
}
writeFileSync(unitPath,renderDirectSystemdUnit(workspace,envFile),"utf8");
execFileSync("systemctl",["--user","daemon-reload"],{stdio:"inherit"});
execFileSync("systemctl",["--user","enable","--now",DIRECT_SYSTEMD_UNIT_NAME],{stdio:"inherit"});
console.log(JSON.stringify({installed:true,unitPath,envFile,service:DIRECT_SYSTEMD_UNIT_NAME},null,2));
EOF

cat > packages/local-agent-core/src/tests/direct-runtime.test.ts <<'EOF'
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { directDaemonStateIsLive, renderDirectSystemdUnit, writeDirectDaemonState, readDirectDaemonState } from "../direct/runtime";

const root=mkdtempSync(path.join(tmpdir(),"gova-direct-runtime-"));
const old=process.env.GOVA_DIRECT_AGENT_DIR; process.env.GOVA_DIRECT_AGENT_DIR=root;
try{
  const unit=renderDirectSystemdUnit("/home/hesham/gova",`${root}/service.env`);
  assert.match(unit,/Restart=on-failure/); assert.match(unit,/RestartSec=5s/); assert.match(unit,/WorkingDirectory=\/home\/hesham\/gova/); assert.match(unit,/EnvironmentFile=-/); assert.doesNotMatch(unit,/PASSWORD=/i);
  const now=new Date().toISOString();
  writeDirectDaemonState({schemaVersion:1,pid:process.pid,running:true,hostId:"test-host",port:48732,bindHost:"0.0.0.0",serverKeyId:"key",startedAt:now,updatedAt:now,discoveryLastPublishedAt:null,bootstrapLastCycleAt:null,lastError:null});
  const state=readDirectDaemonState(); assert.equal(state?.port,48732); assert.equal(directDaemonStateIsLive(state),true);
  console.log("@asol/local-agent-core direct runtime: all checks passed.");
}finally{ if(old===undefined)delete process.env.GOVA_DIRECT_AGENT_DIR;else process.env.GOVA_DIRECT_AGENT_DIR=old; rmSync(root,{recursive:true,force:true}); }
EOF

python3 - <<'PY'
import json
from pathlib import Path
p=Path('package.json'); x=json.loads(p.read_text()); s=x['scripts']
s['local-agent:direct:daemon']='npx tsx scripts/local-agent-direct-daemon.ts'
s['local-agent:direct:install']='npx tsx scripts/install-local-agent-direct-service.ts'
s['local-agent:direct:start']='npx tsx scripts/local-agent-direct-cli.ts start'
s['local-agent:direct:stop']='npx tsx scripts/local-agent-direct-cli.ts stop'
s['local-agent:direct:restart']='npx tsx scripts/local-agent-direct-cli.ts restart'
s['local-agent:direct:status']='npx tsx scripts/local-agent-direct-cli.ts status'
s['local-agent:direct:doctor']='npx tsx scripts/local-agent-direct-cli.ts doctor'
s['local-agent:direct:sessions']='npx tsx scripts/local-agent-direct-cli.ts sessions'
s['local-agent:direct:revoke']='npx tsx scripts/local-agent-direct-cli.ts revoke'
s['local-agent:direct:revoke-all']='npx tsx scripts/local-agent-direct-cli.ts revoke-all'
s['local-agent:direct:key:status']='npx tsx scripts/local-agent-direct-cli.ts key-status'
s['local-agent:direct:key:rotate']='npx tsx scripts/local-agent-direct-cli.ts key-rotate'
s['local-agent:direct:kill-switch']='npx tsx scripts/local-agent-direct-cli.ts kill-switch'
s['test:local-agent-core']='npx tsx packages/local-agent-core/src/tests/index.test.ts && npx tsx packages/local-agent-core/src/tests/direct.test.ts && npx tsx packages/local-agent-core/src/tests/direct-transport.test.ts && npx tsx packages/local-agent-core/src/tests/direct-runtime.test.ts'
p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
PY

cat > docs/07-mobile-and-release/direct-p2p-agent.md <<'EOF'
# Gova Direct P2P Agent

## Purpose

The Direct P2P Agent is the preferred remote-control path for approved agents after bootstrap. It preserves the separation `GitHub = authorization bootstrap`, `R2 = discovery/rendezvous metadata`, `direct transport = commands/results`, and `@asol/local-agent-core = execution and safety`.

## Runtime

The host daemon is `gova-direct-agent.service`, a user systemd service with `Restart=on-failure`. The host keeps linger enabled so the service can start without an interactive desktop login. The unit contains no credentials; its only machine-local environment file is `.local/direct-agent/service.env` with mode `0600`.

The daemon starts the TLS 1.3 direct server, polls the approved GitHub bootstrap namespace, and refreshes Host Discovery in R2 every three minutes. Discovery records expire after ten minutes, so a stopped host naturally becomes stale instead of remaining permanently advertised.

Install and inspect it with:

```bash
npm run local-agent:direct:install
npm run local-agent:direct:doctor
npm run local-agent:direct:status
npm run local-agent:direct:sessions
```

Session and identity controls:

```bash
npm run local-agent:direct:revoke -- <session-id>
npm run local-agent:direct:revoke-all
npm run local-agent:direct:key:status
npm run local-agent:direct:key:rotate
npm run local-agent:direct:kill-switch
```

Rotating the host identity revokes active sessions. The kill switch revokes all sessions and disables/stops the user service.

## Security boundary

The discovery HTTP listener remains discovery-only and never executes commands. Its password is not a direct-shell credential. Direct sessions require the approved GitHub bootstrap, a fresh single-use challenge, X25519 proof, the pinned Ed25519 host identity, TLS 1.3, replay protection, capability checks, secret redaction, coordination locks, and the existing Local Agent mutation model.

GitHub Actions are not part of normal direct command/result transport. R2 must never contain shell commands, patches, stdout, stderr, or general execution results.
EOF

cat >> docs/07-mobile-and-release/local-runner-full-host-control.md <<'EOF'

## Direct P2P runtime

The preferred post-bootstrap remote-control path is the persistent Gova Direct P2P Agent documented in `direct-p2p-agent.md`. GitHub Actions remain an administrative/bootstrap fallback and are not the normal command/result transport once a direct session is established.
EOF

npm run test:local-agent-core
npm run typecheck
npm run architecture:docs
npm run docs:generate
npm run architecture:check
npm run docs:ci
