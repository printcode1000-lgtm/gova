set -euo pipefail
cd /home/hesham/gova
cat > .local/p2p-local-direct-proof.ts <<'TS'
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import path from "node:path";
import {
  DEFAULT_ALLOWED_CAPABILITIES,
  DirectAgentClient,
  createBootstrapAuthRequest,
  directDiscoveryChallengePath,
  directIdentityPubPath,
  generateEphemeralKeyPair,
  hostIdentifier,
  readDirectDaemonState,
  readStoredBootstrapGrant,
  verifySignedBootstrapGrant,
} from "../packages/local-agent-core/src/direct/index.ts";

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function git(args:string[],env:NodeJS.ProcessEnv=process.env,input?:string):string{
  const r=spawnSync("git",args,{encoding:"utf8",env,input,cwd:"/home/hesham/gova"});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||"git failed").trim());
  return r.stdout.trim();
}
function publish(req:any){
  const branch="agent-request/chatgpt", p=`.agent-control/direct-auth/${req.requestId}.json`;
  for(let n=0;n<4;n++){
    git(["fetch","--quiet","origin",branch]); const base=git(["rev-parse",`origin/${branch}`]);
    const idx=path.join(tmpdir(),`gova-direct-${process.pid}-${n}`);
    const env={...process.env,GIT_INDEX_FILE:idx,GIT_AUTHOR_NAME:"gova-direct-client",GIT_AUTHOR_EMAIL:"gova-direct-client@users.noreply.github.com",GIT_COMMITTER_NAME:"gova-direct-client",GIT_COMMITTER_EMAIL:"gova-direct-client@users.noreply.github.com"};
    try{
      git(["read-tree",`${base}^{tree}`],env);
      const blob=git(["hash-object","-w","--stdin"],env,`${JSON.stringify(req,null,2)}\n`);
      git(["update-index","--add","--cacheinfo","100644",blob,p],env);
      const tree=git(["write-tree"],env); const commit=git(["commit-tree",tree,"-p",base,"-m",`Direct auth ${req.requestId}`],env);
      const r=spawnSync("git",["push","--quiet","origin",`${commit}:refs/heads/${branch}`],{encoding:"utf8",env,cwd:"/home/hesham/gova"});
      if(r.status===0)return;
    } finally { if(existsSync(idx)) rmSync(idx,{force:true}); }
  }
  throw new Error("auth publish failed");
}
function lanAddress(){
  for(const addrs of Object.values(networkInterfaces())) for(const a of addrs||[]) if(a.family==="IPv4"&&!a.internal&&a.address.startsWith("192.168.")) return a.address;
  return "127.0.0.1";
}
async function main(){
  const state=readDirectDaemonState(); if(!state?.running) throw new Error("daemon not running");
  const challenge=JSON.parse(readFileSync(directDiscoveryChallengePath(),"utf8")) as {challenge:string;expiresAt:string};
  const identity=readFileSync(directIdentityPubPath(),"utf8");
  const keys=generateEphemeralKeyPair();
  const req=createBootstrapAuthRequest({agentId:"chatgpt-sol",hostId:hostIdentifier(),challenge:challenge.challenge,clientEphemeralPublicKey:keys.publicKeyPem,requestedCapabilities:[...DEFAULT_ALLOWED_CAPABILITIES]});
  publish(req);
  let grant:any=null;
  for(let i=0;i<30;i++){ grant=readStoredBootstrapGrant(req.requestId); if(grant) break; await sleep(500); }
  if(!grant) throw new Error("grant timeout");
  if(!verifySignedBootstrapGrant(grant,identity)) throw new Error("grant signature invalid");
  const host=lanAddress(); const client=new DirectAgentClient(); const t0=Date.now();
  const hs=await client.connect({host,port:state.port,sessionId:grant.sessionId,bootstrapRequestId:grant.requestId,clientKeyPair:keys,bootstrapChallenge:challenge.challenge,serverEphemeralPublicKey:grant.serverEphemeralPublicKey,expectedHostId:hostIdentifier(),expectedServerKeyId:state.serverKeyId,expectedServerIdentityPublicKey:identity,rejectUnauthorized:false});
  const status=await client.status(); let stdout="",stderr="";
  const result=await client.exec("printf 'P2P_DIRECT_OK\\n'; hostname; pwd",{},c=>{if(c.stdout)stdout+=c.stdout;if(c.stderr)stderr+=c.stderr});
  console.log(JSON.stringify({connected:true,handshake:hs.status,path:`lan:tcp:${host}:${state.port}`,latencyMs:Date.now()-t0,stdout,stderr,exitCode:result.exitCode,workspace:(status as any).workspace},null,2));
  await client.close();
}
main().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1}).finally(()=>rmSync(".local/p2p-local-direct-proof.ts",{force:true}));
TS
npx tsx .local/p2p-local-direct-proof.ts
