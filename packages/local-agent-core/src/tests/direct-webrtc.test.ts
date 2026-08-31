import assert from "node:assert/strict";
import { createConnection, createServer } from "node:net";
import { DirectWebRtcClientTunnel, DirectWebRtcHostTunnelManager } from "../direct/webrtc-tunnel";

const echo = createServer((socket) => socket.on("data", (chunk) => socket.write(chunk)));
await new Promise<void>((resolve, reject) => { echo.once("error", reject); echo.listen(0, "127.0.0.1", resolve); });
const echoAddress=echo.address(); if(!echoAddress || typeof echoAddress==="string") throw new Error("echo port");
const host=new DirectWebRtcHostTunnelManager(echoAddress.port,"127.0.0.1",[]);
const client=new DirectWebRtcClientTunnel([]);
try {
  const offer=await client.createOffer();
  assert.match(offer.sdp,/^v=0/m);
  const answer=await host.acceptOffer("session-test",offer);
  await client.acceptAnswer(answer,10_000);
  const local=await client.listenLocal();
  const echoed=await new Promise<string>((resolve,reject)=>{
    const socket=createConnection(local,()=>socket.write("gova-webrtc-direct-ok"));
    socket.setTimeout(5000); socket.once("data",(chunk)=>{resolve(chunk.toString("utf8"));socket.destroy()}); socket.once("error",reject); socket.once("timeout",()=>reject(new Error("echo timeout")));
  });
  assert.equal(echoed,"gova-webrtc-direct-ok");
  assert.deepEqual(host.activeSessionIds(),["session-test"]);
  console.log("@asol/local-agent-core direct WebRTC tunnel: all checks passed.");
} finally {
  await client.close(); host.closeAll(); await new Promise<void>((resolve)=>echo.close(()=>resolve()));
}
