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
