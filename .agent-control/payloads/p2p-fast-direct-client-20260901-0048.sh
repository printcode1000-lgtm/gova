set -euo pipefail
cd /home/hesham/gova
set -a
. .local/direct-agent/service.env
set +a
cat > .local/p2p-fast-direct-client.ts <<'TS'
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import {
  DEFAULT_ALLOWED_CAPABILITIES,
  DirectAgentClient,
  createBootstrapAuthRequest,
  directAuthResultKey,
  generateEphemeralKeyPair,
  verifySignedBootstrapGrant,
  type DirectBootstrapGrant,
} from "../packages/local-agent-core/src/direct/index.ts";

type Discovery = {
  expiresAt:string;
  host:{hostId:string};
  directAgent:{
    serverKeyId:string;
    serverPublicKey:string;
    bootstrap:{branch:string;directory:string;challenge:string};
    candidates:Array<{type:string;address:string;port:number;protocol:"tcp"|"udp";priority:number;expiresAt:string}>;
  };
};

const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function git(args:string[], env:NodeJS.ProcessEnv=process.env, input?:string):string{
  const r=spawnSync("git",args,{encoding:"utf8",env,input,cwd:"/home/hesham/gova"});
  if(r.status!==0) throw new Error((r.stderr||r.stdout||"git failed").trim());
  return r.stdout.trim();
}
function publish(branch:string,directory:string,request:any){
  const p=`${directory}/${request.requestId}.json`;
  for(let attempt=0;attempt<4;attempt++){
    git(["fetch","--quiet","origin",branch]);
    const base=git(["rev-parse",`origin/${branch}`]);
    const idx=path.join(tmpdir(),`gova-p2p-fast-${process.pid}-${attempt}`);
    const env={...process.env,GIT_INDEX_FILE:idx,GIT_AUTHOR_NAME:"gova-direct-client",GIT_AUTHOR_EMAIL:"gova-direct-client@users.noreply.github.com",GIT_COMMITTER_NAME:"gova-direct-client",GIT_COMMITTER_EMAIL:"gova-direct-client@users.noreply.github.com"};
    try{
      git(["read-tree",`${base}^{tree}`],env);
      const blob=git(["hash-object","-w","--stdin"],env,`${JSON.stringify(request,null,2)}\n`);
      git(["update-index","--add","--cacheinfo","100644",blob,p],env);
      const tree=git(["write-tree"],env);
      const commit=git(["commit-tree",tree,"-p",base,"-m",`Direct auth ${request.requestId}`],env);
      const push=spawnSync("git",["push","--quiet","origin",`${commit}:refs/heads/${branch}`],{encoding:"utf8",env,cwd:"/home/hesham/gova"});
      if(push.status===0) return;
    }finally{ if(existsSync(idx)) rmSync(idx,{force:true}); }
  }
  throw new Error("bootstrap publish failed");
}

async function main(){
  const base=(process.env.ASOL_OTA_R2_PUBLIC_URL||"").replace(/\/$/,"");
  if(!base) throw new Error("public discovery base unavailable");
  const key=process.env.GOVA_DIRECT_DISCOVERY_KEY||process.env.ASOL_DEVICE_DISCOVERY_R2_KEY||`host-discovery/${hostname().toLowerCase().replace(/[^a-z0-9._-]+/g,"-")}.json`;
  const res=await fetch(`${base}/${key}`,{cache:"no-store"});
  if(!res.ok) throw new Error(`discovery ${res.status}`);
  const d=await res.json() as Discovery;
  if(Date.parse(d.expiresAt)<=Date.now()) throw new Error("discovery expired");
  const pair=generateEphemeralKeyPair();
  const req=createBootstrapAuthRequest({agentId:"chatgpt-sol",hostId:d.host.hostId,challenge:d.directAgent.bootstrap.challenge,clientEphemeralPublicKey:pair.publicKeyPem,requestedCapabilities:[...DEFAULT_ALLOWED_CAPABILITIES]});
  publish(d.directAgent.bootstrap.branch,d.directAgent.bootstrap.directory,req);
  const grantUrl=`${base}/${directAuthResultKey(d.host.hostId,req.requestId)}`;
  let grant:DirectBootstrapGrant|undefined;
  for(let i=0;i<40;i++){
    const g=await fetch(grantUrl,{cache:"no-store"}).catch(()=>null);
    if(g?.ok){ grant=await g.json() as DirectBootstrapGrant; break; }
    await sleep(500);
  }
  if(!grant) throw new Error("bootstrap grant timeout");
  if(!verifySignedBootstrapGrant(grant,d.directAgent.serverPublicKey)) throw new Error("grant signature invalid");
  const candidates=d.directAgent.candidates.filter(c=>c.protocol==="tcp"&&c.type!=="loopback"&&Date.parse(c.expiresAt)>Date.now()).sort((a,b)=>b.priority-a.priority);
  if(!candidates.length) throw new Error("no direct tcp candidate");
  let last:any;
  for(const c of candidates){
    const client=new DirectAgentClient();
    try{
      const started=Date.now();
      await client.connect({host:c.address,port:c.port,sessionId:grant.sessionId,bootstrapRequestId:grant.requestId,clientKeyPair:pair,bootstrapChallenge:d.directAgent.bootstrap.challenge,serverEphemeralPublicKey:grant.serverEphemeralPublicKey,expectedHostId:d.host.hostId,expectedServerKeyId:d.directAgent.serverKeyId,expectedServerIdentityPublicKey:d.directAgent.serverPublicKey,rejectUnauthorized:false});
      const status=await client.status();
      let stdout="",stderr="";
      const exec=await client.exec("printf 'P2P_DIRECT_OK\\n'; hostname; pwd",{},chunk=>{if(chunk.stdout)stdout+=chunk.stdout;if(chunk.stderr)stderr+=chunk.stderr});
      console.log(JSON.stringify({connected:true,path:`${c.type}:tcp:${c.address}:${c.port}`,latencyMs:Date.now()-started,status,stdout,stderr,exec},null,2));
      await client.close();
      return;
    }catch(e){ last=e; await client.close().catch(()=>undefined); }
  }
  throw last||new Error("direct-path-unavailable");
}
main().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1});
TS
npx tsx .local/p2p-fast-direct-client.ts
rm -f .local/p2p-fast-direct-client.ts
