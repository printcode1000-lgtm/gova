import { createConnection, createServer, type Server, type Socket } from "node:net";
import { RTCPeerConnection, type RTCDataChannel } from "werift";
import { DEFAULT_STUN_SERVERS } from "./candidates";
import { DirectAgentError } from "./errors";

export const DIRECT_WEBRTC_TUNNEL_KIND = "webrtc-datachannel-tcp-tunnel-v1" as const;
export const DIRECT_WEBRTC_CHANNEL_LABEL = "gova-direct-tcp-v1";
export const DIRECT_WEBRTC_SIGNALING_MAX_BYTES = 256 * 1024;

export interface DirectWebRtcOffer {
  kind: typeof DIRECT_WEBRTC_TUNNEL_KIND;
  sdp: string;
}
export interface DirectWebRtcAnswer {
  kind: typeof DIRECT_WEBRTC_TUNNEL_KIND;
  sdp: string;
}

function iceServers(servers: string[]) {
  return servers.map((entry) => ({ urls: `stun:${entry}` }));
}

function normalizeData(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  if (typeof data === "string") return Buffer.from(data, "utf8");
  throw new DirectAgentError("transport-error", "Unsupported WebRTC DataChannel payload type.");
}

function validateSdp(sdp: string, kind: "offer" | "answer"): void {
  if (typeof sdp !== "string" || !sdp.startsWith("v=0")) {
    throw new DirectAgentError("invalid-message", `Invalid WebRTC ${kind} SDP.`);
  }
  if (Buffer.byteLength(sdp, "utf8") > DIRECT_WEBRTC_SIGNALING_MAX_BYTES) {
    throw new DirectAgentError("invalid-message", `WebRTC ${kind} SDP exceeds signaling size limit.`);
  }
}

function closeSocket(socket: Socket | null): void {
  if (socket && !socket.destroyed) socket.destroy();
}

function closeChannel(channel: RTCDataChannel | null): void {
  try { channel?.close(); } catch { /* best effort */ }
}

export class DirectWebRtcHostTunnelManager {
  private peers = new Map<string, RTCPeerConnection>();

  constructor(
    private targetPort: number,
    private targetHost = "127.0.0.1",
    private stunServers = DEFAULT_STUN_SERVERS,
  ) {}

  async acceptOffer(sessionId: string, offer: DirectWebRtcOffer): Promise<DirectWebRtcAnswer> {
    if (offer.kind !== DIRECT_WEBRTC_TUNNEL_KIND) throw new DirectAgentError("invalid-message", "Unsupported WebRTC tunnel kind.");
    validateSdp(offer.sdp, "offer");
    this.close(sessionId);
    const pc = new RTCPeerConnection({ iceServers: iceServers(this.stunServers) });
    this.peers.set(sessionId, pc);

    pc.ondatachannel = ({ channel }) => {
      if (channel.label !== DIRECT_WEBRTC_CHANNEL_LABEL) { closeChannel(channel); return; }
      let socket: Socket | null = null;
      channel.onopen = () => {
        socket = createConnection({ host: this.targetHost, port: this.targetPort });
        socket.on("data", (chunk) => {
          if (channel.readyState === "open") channel.send(chunk);
        });
        socket.on("error", () => closeChannel(channel));
        socket.on("close", () => closeChannel(channel));
      };
      channel.onmessage = ({ data }) => {
        try { if (socket && !socket.destroyed) socket.write(normalizeData(data)); }
        catch { closeSocket(socket); closeChannel(channel); }
      };
      channel.onclose = () => closeSocket(socket);
      channel.onerror = () => closeSocket(socket);
    };

    try {
      await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      const sdp = pc.localDescription?.sdp;
      if (!sdp) throw new DirectAgentError("transport-error", "WebRTC answer did not produce a local SDP.");
      validateSdp(sdp, "answer");
      return { kind: DIRECT_WEBRTC_TUNNEL_KIND, sdp };
    } catch (error) {
      this.close(sessionId);
      throw error;
    }
  }

  close(sessionId: string): void {
    const pc = this.peers.get(sessionId);
    if (!pc) return;
    this.peers.delete(sessionId);
    try { pc.close(); } catch { /* best effort */ }
  }

  closeAll(): void {
    for (const sessionId of [...this.peers.keys()]) this.close(sessionId);
  }

  activeSessionIds(): string[] { return [...this.peers.keys()]; }
}

export class DirectWebRtcClientTunnel {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel;
  private localServer: Server | null = null;
  private localSocket: Socket | null = null;

  constructor(private stunServers = DEFAULT_STUN_SERVERS) {
    this.pc = new RTCPeerConnection({ iceServers: iceServers(this.stunServers) });
    this.channel = this.pc.createDataChannel(DIRECT_WEBRTC_CHANNEL_LABEL, { ordered: true });
    this.channel.onmessage = ({ data }) => {
      try { if (this.localSocket && !this.localSocket.destroyed) this.localSocket.write(normalizeData(data)); }
      catch { closeSocket(this.localSocket); }
    };
    this.channel.onclose = () => closeSocket(this.localSocket);
    this.channel.onerror = () => closeSocket(this.localSocket);
  }

  async createOffer(): Promise<DirectWebRtcOffer> {
    await this.pc.setLocalDescription(await this.pc.createOffer());
    const sdp = this.pc.localDescription?.sdp;
    if (!sdp) throw new DirectAgentError("transport-error", "WebRTC offer did not produce a local SDP.");
    validateSdp(sdp, "offer");
    return { kind: DIRECT_WEBRTC_TUNNEL_KIND, sdp };
  }

  async acceptAnswer(answer: DirectWebRtcAnswer, timeoutMs = 15_000): Promise<void> {
    if (answer.kind !== DIRECT_WEBRTC_TUNNEL_KIND) throw new DirectAgentError("invalid-message", "Unsupported WebRTC answer kind.");
    validateSdp(answer.sdp, "answer");
    await this.pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
    if (this.channel.readyState === "open") return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new DirectAgentError("direct-path-unavailable", "Timed out waiting for WebRTC DataChannel.")), timeoutMs);
      const previousOpen = this.channel.onopen;
      const previousError = this.channel.onerror;
      this.channel.onopen = () => { clearTimeout(timer); previousOpen?.(); resolve(); };
      this.channel.onerror = (event) => { clearTimeout(timer); previousError?.(event); reject(new DirectAgentError("transport-error", "WebRTC DataChannel failed to open.")); };
    });
  }

  async listenLocal(): Promise<{ host: "127.0.0.1"; port: number }> {
    if (this.channel.readyState !== "open") throw new DirectAgentError("transport-error", "WebRTC DataChannel is not open.");
    if (this.localServer) throw new DirectAgentError("transport-error", "Local WebRTC bridge already listening.");
    this.localServer = createServer((socket) => {
      if (this.localSocket && !this.localSocket.destroyed) { socket.destroy(new Error("Only one direct TLS connection is allowed per tunnel.")); return; }
      this.localSocket = socket;
      socket.on("data", (chunk) => { if (this.channel.readyState === "open") this.channel.send(chunk); });
      socket.on("close", () => { if (this.localSocket === socket) this.localSocket = null; });
      socket.on("error", () => { if (this.localSocket === socket) this.localSocket = null; });
    });
    await new Promise<void>((resolve, reject) => { this.localServer!.once("error", reject); this.localServer!.listen(0, "127.0.0.1", resolve); });
    const address = this.localServer.address();
    if (!address || typeof address === "string") throw new DirectAgentError("transport-error", "Failed to allocate local WebRTC bridge port.");
    return { host: "127.0.0.1", port: address.port };
  }

  async close(): Promise<void> {
    closeSocket(this.localSocket); this.localSocket = null;
    if (this.localServer) await new Promise<void>((resolve) => this.localServer!.close(() => resolve()));
    this.localServer = null; closeChannel(this.channel); this.pc.close();
  }
}
