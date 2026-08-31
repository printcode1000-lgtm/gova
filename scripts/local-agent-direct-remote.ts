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
