#!/usr/bin/env bash
set -euo pipefail

cat > packages/local-agent-core/src/direct/rendezvous.ts <<'EOF'
import type { DirectWebRtcAnswer, DirectWebRtcOffer } from "./webrtc-tunnel";

export const DIRECT_RENDEZVOUS_PREFIX = "direct-rendezvous";
export const DIRECT_RENDEZVOUS_TTL_MS = 60_000;
export const DIRECT_RENDEZVOUS_POLL_MS = 1_000;

function safe(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export interface DirectRendezvousOfferDocument {
  schemaVersion: 1;
  requestId: string;
  sessionId: string;
  bootstrapRequestId: string;
  hostId: string;
  createdAt: string;
  expiresAt: string;
  offer: DirectWebRtcOffer;
}

export interface DirectRendezvousAnswerDocument {
  schemaVersion: 1;
  requestId: string;
  sessionId: string;
  hostId: string;
  createdAt: string;
  expiresAt: string;
  answer: DirectWebRtcAnswer;
}

export function directRendezvousHostPrefix(hostId: string): string {
  return `${DIRECT_RENDEZVOUS_PREFIX}/${safe(hostId)}`;
}

export function directRendezvousOfferKey(hostId: string, requestId: string): string {
  return `${directRendezvousHostPrefix(hostId)}/offers/${safe(requestId)}.json`;
}

export function directRendezvousAnswerKey(hostId: string, requestId: string): string {
  return `${directRendezvousHostPrefix(hostId)}/answers/${safe(requestId)}.json`;
}

export function rendezvousDocumentIsFresh(document: { createdAt?: string; expiresAt?: string }, now = Date.now()): boolean {
  const created = Date.parse(document.createdAt ?? "");
  const expires = Date.parse(document.expiresAt ?? "");
  return Number.isFinite(created) && Number.isFinite(expires) && created <= now + 10_000 && expires > now && expires - created <= DIRECT_RENDEZVOUS_TTL_MS + 5_000;
}
EOF

python3 - <<'PY'
from pathlib import Path
p=Path('packages/local-agent-core/src/direct/index.ts')
s=p.read_text()
if 'export * from "./rendezvous";' not in s:
    s += 'export * from "./rendezvous";\n'
p.write_text(s)

p=Path('packages/local-agent-core/src/host-discovery.ts')
s=p.read_text()
if 'DIRECT_RENDEZVOUS_PREFIX' not in s:
    s=s.replace('import { directAuthResultKeyPrefix } from "./direct/bootstrap";', 'import { directAuthResultKeyPrefix } from "./direct/bootstrap";\nimport { DIRECT_RENDEZVOUS_PREFIX, DIRECT_RENDEZVOUS_TTL_MS } from "./direct/rendezvous";\nimport { DIRECT_WEBRTC_TUNNEL_KIND } from "./direct/webrtc-tunnel";')
s=s.replace('    transport: "tls-tcp";\n    port: number;', '    transport: "tls-tcp";\n    transports: Array<"tls-tcp" | typeof DIRECT_WEBRTC_TUNNEL_KIND>;\n    port: number;')
s=s.replace('    capabilities: DirectCapability[];\n    candidates: DirectCandidate[];', '    capabilities: DirectCapability[];\n    candidates: DirectCandidate[];\n    rendezvous: { prefix: string; ttlMs: number };')
s=s.replace('      transport: "tls-tcp",\n      port: input.directPort,', '      transport: "tls-tcp",\n      transports: ["tls-tcp", DIRECT_WEBRTC_TUNNEL_KIND],\n      port: input.directPort,')
s=s.replace('      candidates: input.candidates,\n    },', '      candidates: input.candidates,\n      rendezvous: { prefix: `${DIRECT_RENDEZVOUS_PREFIX}/${input.hostId}`, ttlMs: DIRECT_RENDEZVOUS_TTL_MS },\n    },')
p.write_text(s)
PY

cat > scripts/local-agent-direct-daemon.ts <<'EOF'
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
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";
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

const previous=readDirectDaemonState();
if (directDaemonStateIsLive(previous) && previous?.pid !== process.pid) throw new Error(`Direct daemon already running with pid ${previous?.pid}.`);
await server.start(); persist();
console.log(JSON.stringify({event:"direct-daemon-started",hostId,port,pid:process.pid,serverKeyId:identity.serverKeyId,transports:["tls-tcp","webrtc-datachannel-tcp-tunnel-v1"]}));
await Promise.all([refreshDiscovery(),bootstrapCycle(),rendezvousCycle()]);
const bootstrapTimer=setInterval(()=>{void bootstrapCycle()},DIRECT_BOOTSTRAP_POLL_MS);
const discoveryTimer=setInterval(()=>{void refreshDiscovery()},DIRECT_DISCOVERY_REFRESH_MS);
const rendezvousTimer=setInterval(()=>{void rendezvousCycle()},DIRECT_RENDEZVOUS_POLL_MS);
const stateTimer=setInterval(persist,30_000);
for (const signal of ["SIGTERM","SIGINT","SIGHUP"] as const) process.once(signal,()=>{void shutdown(signal)});
EOF

cat > scripts/local-agent-direct-remote.ts <<'EOF'
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import {
  DEFAULT_ALLOWED_CAPABILITIES,
  DirectAgentClient,
  DirectWebRtcClientTunnel,
  createBootstrapAuthRequest,
  directAuthResultKey,
  directRendezvousAnswerKey,
  directRendezvousOfferKey,
  generateEphemeralKeyPair,
  generateRequestId,
  rendezvousDocumentIsFresh,
  verifySignedBootstrapGrant,
  type DirectBootstrapGrant,
  type DirectRendezvousAnswerDocument,
  type DirectRendezvousOfferDocument,
} from "@asol/local-agent-core/direct";
import {
  createOtaR2Client,
  deleteOtaObject,
  getOtaObjectBytes,
  getOtaPublicBaseUrl,
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";

interface Discovery {
  expiresAt: string;
  host: { hostId: string; hostname: string };
  directAgent: {
    port: number; serverKeyId: string; serverPublicKey: string;
    bootstrap: { branch: string; directory: string; challenge: string; challengeExpiresAt: string; resultKeyPrefix: string };
    candidates: Array<{type:string;address:string;port:number;protocol:"tcp"|"udp";priority:number;expiresAt:string}>;
    rendezvous?: {prefix:string;ttlMs:number};
  };
}

function arg(name: string): string | undefined { const i=process.argv.indexOf(`--${name}`); return i>=0?process.argv[i+1]:undefined; }
function sleep(ms:number){return new Promise(r=>setTimeout(r,ms))}
function safeHostKey(){ return `host-discovery/${hostname().toLowerCase().replace(/[^a-z0-9._-]+/g,"-")}.json`; }

async function discover(): Promise<Discovery> {
  loadOtaEnvironment();
  const key=arg("discovery-key") || process.env.GOVA_DIRECT_DISCOVERY_KEY || process.env.ASOL_DEVICE_DISCOVERY_R2_KEY || safeHostKey();
  const url=`${getOtaPublicBaseUrl().replace(/\/$/,"")}/${key}`;
  const res=await fetch(url,{cache:"no-store"}); if(!res.ok) throw new Error(`discovery fetch failed: ${res.status}`);
  const doc=await res.json() as Discovery;
  if(Date.parse(doc.expiresAt)<=Date.now()) throw new Error("Host Discovery is expired.");
  return doc;
}

function git(args:string[], env:NodeJS.ProcessEnv=process.env, input?:string): string {
  const r=spawnSync("git",args,{encoding:"utf8",env,input});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||`git ${args.join(" ")} failed`).trim());
  return r.stdout.trim();
}

function publishAuthRequest(branch:string, directory:string, request:unknown): void {
  const requestId=(request as {requestId:string}).requestId;
  const authPath=`${directory}/${requestId}.json`;
  for(let attempt=0;attempt<4;attempt++){
    try{
      git(["fetch","--quiet","origin",branch]);
      const base=git(["rev-parse",`origin/${branch}`]);
      const index=path.join(tmpdir(),`gova-direct-index-${process.pid}-${Date.now()}-${attempt}`);
      const env={...process.env,GIT_INDEX_FILE:index,GIT_AUTHOR_NAME:"gova-direct-agent",GIT_AUTHOR_EMAIL:"gova-direct-agent@users.noreply.github.com",GIT_COMMITTER_NAME:"gova-direct-agent",GIT_COMMITTER_EMAIL:"gova-direct-agent@users.noreply.github.com"};
      try{
        git(["read-tree",`${base}^{tree}`],env);
        const blob=git(["hash-object","-w","--stdin"],env,`${JSON.stringify(request,null,2)}\n`);
        git(["update-index","--add","--cacheinfo","100644",blob,authPath],env);
        const tree=git(["write-tree"],env);
        const commit=git(["commit-tree",tree,"-p",base,"-m",`Direct auth ${requestId}`],env);
        git(["push","--quiet","origin",`${commit}:refs/heads/${branch}`],env);
        return;
      } finally { if(existsSync(index)) rmSync(index,{force:true}); }
    }catch(error){ if(attempt===3) throw error; }
  }
}

async function waitGrant(discovery:Discovery, requestId:string, timeoutMs=20_000):Promise<DirectBootstrapGrant>{
  const url=`${getOtaPublicBaseUrl().replace(/\/$/,"")}/${directAuthResultKey(discovery.host.hostId,requestId)}`;
  const until=Date.now()+timeoutMs;
  while(Date.now()<until){
    try{
      const res=await fetch(url,{cache:"no-store"});
      if(res.ok){ const grant=await res.json() as DirectBootstrapGrant; if(!verifySignedBootstrapGrant(grant,discovery.directAgent.serverPublicKey)) throw new Error("Bootstrap grant identity signature failed."); return grant; }
    }catch(error){ if(error instanceof Error && error.message.includes("signature")) throw error; }
    await sleep(500);
  }
  throw new Error("Timed out waiting for direct bootstrap grant.");
}

async function connectTls(discovery:Discovery, grant:DirectBootstrapGrant, keyPair:ReturnType<typeof generateEphemeralKeyPair>, host:string, port:number):Promise<DirectAgentClient>{
  const client=new DirectAgentClient();
  await Promise.race([
    client.connect({host,port,sessionId:grant.sessionId,bootstrapRequestId:grant.requestId,clientKeyPair:keyPair,bootstrapChallenge:discovery.directAgent.bootstrap.challenge,serverEphemeralPublicKey:grant.serverEphemeralPublicKey,expectedHostId:discovery.host.hostId,expectedServerKeyId:discovery.directAgent.serverKeyId,expectedServerIdentityPublicKey:discovery.directAgent.serverPublicKey,rejectUnauthorized:false}),
    new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("direct TCP timeout")),3500)),
  ]);
  return client;
}

async function connectAuto(discovery:Discovery, grant:DirectBootstrapGrant, keyPair:ReturnType<typeof generateEphemeralKeyPair>):Promise<{client:DirectAgentClient;path:string;tunnel?:DirectWebRtcClientTunnel}>{
  const tcp=[...discovery.directAgent.candidates].filter(c=>c.protocol==="tcp" && c.type!=="loopback" && Date.parse(c.expiresAt)>Date.now()).sort((a,b)=>b.priority-a.priority);
  for(const candidate of tcp){
    try { const client=await connectTls(discovery,grant,keyPair,candidate.address,candidate.port); return {client,path:`${candidate.type}:tcp:${candidate.address}:${candidate.port}`}; }
    catch { /* try next path */ }
  }
  const r2=createOtaR2Client();
  const tunnel=new DirectWebRtcClientTunnel();
  const requestId=generateRequestId();
  const now=Date.now();
  const offerDoc:DirectRendezvousOfferDocument={schemaVersion:1,requestId,sessionId:grant.sessionId,bootstrapRequestId:grant.requestId,hostId:discovery.host.hostId,createdAt:new Date(now).toISOString(),expiresAt:new Date(now+60_000).toISOString(),offer:await tunnel.createOffer()};
  const offerKey=directRendezvousOfferKey(discovery.host.hostId,requestId);
  const answerKey=directRendezvousAnswerKey(discovery.host.hostId,requestId);
  await putOtaObject(r2,offerKey,`${JSON.stringify(offerDoc)}\n`,"application/json","no-store");
  const until=Date.now()+20_000; let answerDoc:DirectRendezvousAnswerDocument|undefined;
  while(Date.now()<until){
    try { answerDoc=JSON.parse(Buffer.from(await getOtaObjectBytes(r2,answerKey)).toString("utf8")) as DirectRendezvousAnswerDocument; if(answerDoc && rendezvousDocumentIsFresh(answerDoc)) break; }
    catch { /* not ready */ }
    await sleep(350);
  }
  await deleteOtaObject(r2,offerKey).catch(()=>undefined); await deleteOtaObject(r2,answerKey).catch(()=>undefined);
  if(!answerDoc || !rendezvousDocumentIsFresh(answerDoc)) { await tunnel.close(); throw new Error("direct-path-unavailable"); }
  await tunnel.acceptAnswer(answerDoc.answer,15_000);
  const local=await tunnel.listenLocal();
  const client=await connectTls(discovery,grant,keyPair,local.host,local.port);
  return {client,path:"webrtc:ice:udp:datachannel",tunnel};
}

async function open(){
  const discovery=await discover();
  const keyPair=generateEphemeralKeyPair();
  const request=createBootstrapAuthRequest({agentId:"chatgpt-sol",hostId:discovery.host.hostId,challenge:discovery.directAgent.bootstrap.challenge,clientEphemeralPublicKey:keyPair.publicKeyPem,requestedCapabilities:[...DEFAULT_ALLOWED_CAPABILITIES]});
  publishAuthRequest(discovery.directAgent.bootstrap.branch,discovery.directAgent.bootstrap.directory,request);
  const grant=await waitGrant(discovery,request.requestId);
  const connected=await connectAuto(discovery,grant,keyPair);
  return {discovery,grant,...connected};
}

async function main(){
  const command=process.argv[2]||"status";
  if(command==="discover"){ console.log(JSON.stringify(await discover(),null,2)); return; }
  const started=Date.now(); const session=await open();
  try{
    if(command==="status"){ console.log(JSON.stringify({path:session.path,latencyMs:Date.now()-started,result:await session.client.status()},null,2)); return; }
    if(command==="exec"){
      const marker=process.argv.indexOf("--"); const shell=marker>=0?process.argv.slice(marker+1).join(" "):process.argv.slice(3).join(" "); if(!shell) throw new Error("exec command required after --");
      let stdout="",stderr=""; const result=await session.client.exec(shell,{},chunk=>{if(chunk.stdout)stdout+=chunk.stdout;if(chunk.stderr)stderr+=chunk.stderr});
      console.log(JSON.stringify({path:session.path,latencyMs:Date.now()-started,stdout,stderr,...result},null,2)); return;
    }
    if(command==="inspect-read"){ const target=process.argv[3]; if(!target) throw new Error("path required"); console.log(JSON.stringify({path:session.path,result:await session.client.inspectRead(target)},null,2)); return; }
    if(command==="git-status"){ console.log(JSON.stringify({path:session.path,result:await session.client.gitStatus()},null,2)); return; }
    throw new Error(`unknown remote command: ${command}`);
  } finally { await session.client.close().catch(()=>undefined); await session.tunnel?.close().catch(()=>undefined); }
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1});
EOF

python3 - <<'PY'
import json
from pathlib import Path
p=Path('package.json'); data=json.loads(p.read_text())
s=data['scripts']
s['local-agent:direct:remote']='npx tsx scripts/local-agent-direct-remote.ts'
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

p=Path('.github/workflows/local-agent-gateway.yml')
s=p.read_text()
if 'paths:' not in s.split('permissions:')[0]:
    s=s.replace('    branches:\n      - "agent-request/**"\n', '    branches:\n      - "agent-request/**"\n    paths:\n      - ".agent-control/requests/**"\n      - ".agent-control/payloads/**"\n')
p.write_text(s)
PY

npm run typecheck
