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
