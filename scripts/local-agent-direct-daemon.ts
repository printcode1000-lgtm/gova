import { spawn } from "node:child_process";
import {
  DIRECT_BOOTSTRAP_POLL_MS,
  DIRECT_DISCOVERY_REFRESH_MS,
  DIRECT_RENDEZVOUS_POLL_MS,
  DirectAgentServer,
  DirectWebRtcHostTunnelManager,
  ReplayCache,
  SessionStore,
  directDaemonStateIsLive,
  directRendezvousAnswerKey,
  directRendezvousHostPrefix,
  hostIdentifier,
  loadOrCreateHostIdentityKey,
  readDirectDaemonState,
  rendezvousDocumentIsFresh,
  resolveDirectAgentPort,
  writeDirectDaemonState,
  type DirectDaemonState,
  type DirectRendezvousAnswerDocument,
  type DirectRendezvousOfferDocument,
} from "@asol/local-agent-core/direct";
import {
  createOtaR2Client,
  deleteOtaObject,
  getOtaObjectBytes,
  listOtaObjectKeys,
  putOtaObject,
} from "../packages/ota-core/src/publishing/adapters/r2-storage.adapter";
import { loadOtaEnvironment } from "../packages/ota-core/src/publishing/config/ota-config";
import { runDirectBootstrapCycle } from "./local-agent-direct-bootstrap";

loadOtaEnvironment();
const hostId = hostIdentifier();
const port = resolveDirectAgentPort();
const identity = loadOrCreateHostIdentityKey();
const sessionStore = new SessionStore();
const replayCache = new ReplayCache();
const server = new DirectAgentServer({ port, bindHost: "0.0.0.0", sessionStore, replayCache });
const webRtc = new DirectWebRtcHostTunnelManager(port, "127.0.0.1");
const r2 = createOtaR2Client();
const startedAt = new Date().toISOString();
let stopping = false;
let discoveryLastPublishedAt: string | null = null;
let bootstrapLastCycleAt: string | null = null;
let lastError: string | null = null;
let bootstrapBusy = false;
let discoveryBusy = false;
let rendezvousBusy = false;
let bootstrapTimer: ReturnType<typeof setInterval>;
let discoveryTimer: ReturnType<typeof setInterval>;
let rendezvousTimer: ReturnType<typeof setInterval>;
let stateTimer: ReturnType<typeof setInterval>;

function state(): DirectDaemonState {
  return { schemaVersion: 1, pid: process.pid, running: !stopping, hostId, port, bindHost: "0.0.0.0", serverKeyId: identity.serverKeyId, startedAt, updatedAt: new Date().toISOString(), discoveryLastPublishedAt, bootstrapLastCycleAt, lastError };
}
function persist(): void { writeDirectDaemonState(state()); }

async function refreshDiscovery(): Promise<void> {
  if (discoveryBusy || stopping) return;
  discoveryBusy = true;
  await new Promise<void>((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/local-agent-device-discovery.ts", "--publish-only"], { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr?.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("close", (code) => { if (code === 0) { discoveryLastPublishedAt = new Date().toISOString(); lastError = null; } else lastError = `discovery-refresh-failed:${code}:${stderr.trim().slice(0,300)}`; discoveryBusy=false; persist(); resolve(); });
    child.on("error", (error) => { lastError=`discovery-refresh-error:${error.message}`; discoveryBusy=false; persist(); resolve(); });
  });
}

async function bootstrapCycle(): Promise<void> {
  if (bootstrapBusy || stopping) return;
  bootstrapBusy = true;
  try { await runDirectBootstrapCycle(); bootstrapLastCycleAt = new Date().toISOString(); lastError = null; }
  catch (error) { lastError = `bootstrap-cycle:${error instanceof Error ? error.message : String(error)}`; }
  finally { bootstrapBusy = false; persist(); }
}

async function rendezvousCycle(): Promise<void> {
  if (rendezvousBusy || stopping) return;
  rendezvousBusy = true;
  try {
    const prefix = `${directRendezvousHostPrefix(hostId)}/offers/`;
    const keys = await listOtaObjectKeys(r2, prefix);
    for (const key of keys.slice(0, 32)) {
      let doc: DirectRendezvousOfferDocument | null = null;
      try { doc = JSON.parse(Buffer.from(await getOtaObjectBytes(r2, key)).toString("utf8")) as DirectRendezvousOfferDocument; }
      catch { await deleteOtaObject(r2, key).catch(()=>undefined); continue; }
      if (!doc || doc.schemaVersion !== 1 || doc.hostId !== hostId || !rendezvousDocumentIsFresh(doc)) { await deleteOtaObject(r2, key).catch(()=>undefined); continue; }
      try {
        const session = sessionStore.validateActiveSession(doc.sessionId);
        if (session.bootstrapRequestId !== doc.bootstrapRequestId) throw new Error("bootstrap request mismatch");
        const answer = await webRtc.acceptOffer(doc.sessionId, doc.offer);
        const answerDoc: DirectRendezvousAnswerDocument = { schemaVersion:1, requestId:doc.requestId, sessionId:doc.sessionId, hostId, createdAt:new Date().toISOString(), expiresAt:doc.expiresAt, answer };
        await putOtaObject(r2, directRendezvousAnswerKey(hostId, doc.requestId), `${JSON.stringify(answerDoc)}\n`, "application/json", "no-store");
        await deleteOtaObject(r2, key);
        console.log(JSON.stringify({event:"direct-webrtc-answer-published",requestId:doc.requestId,sessionId:doc.sessionId}));
      } catch (error) {
        await deleteOtaObject(r2, key).catch(()=>undefined);
        console.error(JSON.stringify({event:"direct-webrtc-offer-rejected",requestId:doc.requestId,error:error instanceof Error?error.message:String(error)}));
      }
    }
  } catch (error) { lastError=`rendezvous-cycle:${error instanceof Error?error.message:String(error)}`; persist(); }
  finally { rendezvousBusy=false; }
}

async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping=true; lastError=`shutdown:${signal}`; persist();
  clearInterval(bootstrapTimer); clearInterval(discoveryTimer); clearInterval(rendezvousTimer); clearInterval(stateTimer);
  webRtc.closeAll(); await server.stop(); persist(); process.exit(0);
}

async function main(): Promise<void> {
  const previous=readDirectDaemonState();
  if (directDaemonStateIsLive(previous) && previous?.pid !== process.pid) throw new Error(`Direct daemon already running with pid ${previous?.pid}.`);
  await server.start(); persist();
  console.log(JSON.stringify({event:"direct-daemon-started",hostId,port,pid:process.pid,serverKeyId:identity.serverKeyId,transports:["tls-tcp","webrtc-datachannel-tcp-tunnel-v1"]}));
  await Promise.all([refreshDiscovery(),bootstrapCycle(),rendezvousCycle()]);
  bootstrapTimer=setInterval(()=>{void bootstrapCycle()},DIRECT_BOOTSTRAP_POLL_MS);
  discoveryTimer=setInterval(()=>{void refreshDiscovery()},DIRECT_DISCOVERY_REFRESH_MS);
  rendezvousTimer=setInterval(()=>{void rendezvousCycle()},DIRECT_RENDEZVOUS_POLL_MS);
  stateTimer=setInterval(persist,30_000);
  for (const signal of ["SIGTERM","SIGINT","SIGHUP"] as const) process.once(signal,()=>{void shutdown(signal)});
}

void main().catch((error) => {
  lastError = `daemon-start:${error instanceof Error ? error.message : String(error)}`;
  persist();
  console.error(error);
  process.exitCode = 1;
});
