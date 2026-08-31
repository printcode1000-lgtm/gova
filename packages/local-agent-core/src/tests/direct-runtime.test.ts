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
