import { EventEmitter } from "node:events";
import { connect as tlsConnect, TLSSocket } from "node:tls";

import { EphemeralKeyPair, generateEphemeralKeyPair, generateNonce, generateRequestId } from "./crypto";
import { DirectAgentError } from "./errors";
import {
  DIRECT_PROTOCOL_VERSION,
  DirectExecRequestPayload,
  DirectHandshakeRequestPayload,
  DirectHandshakeResponsePayload,
  DirectInspectListRequestPayload,
  DirectInspectReadRequestPayload,
  DirectInspectSearchRequestPayload,
  DirectPatchApplyRequestPayload,
  DirectRequestEnvelope,
  DirectResponseEnvelope,
} from "./protocol";

export interface DirectClientConnectOptions {
  host: string;
  port: number;
  sessionId: string;
  bootstrapRequestId: string;
  clientKeyPair?: EphemeralKeyPair;
  rejectUnauthorized?: boolean;
}

export class DirectAgentClient extends EventEmitter {
  private socket: TLSSocket | null = null;
  private sessionId = "";
  private sequence = 1;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      onStreamEvent?: (event: DirectResponseEnvelope) => void;
    }
  >();
  private buffer = Buffer.alloc(0);
  private keyPair: EphemeralKeyPair;

  constructor() {
    super();
    this.keyPair = generateEphemeralKeyPair();
  }

  get clientPublicKey(): string {
    return this.keyPair.publicKeyPem;
  }

  async connect(options: DirectClientConnectOptions): Promise<DirectHandshakeResponsePayload> {
    this.sessionId = options.sessionId;
    if (options.clientKeyPair) {
      this.keyPair = options.clientKeyPair;
    }

    return new Promise((resolve, reject) => {
      this.socket = tlsConnect(
        {
          host: options.host,
          port: options.port,
          rejectUnauthorized: options.rejectUnauthorized ?? false,
          minVersion: "TLSv1.3",
        },
        async () => {
          try {
            const handshakeReq: DirectRequestEnvelope<DirectHandshakeRequestPayload> = {
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: this.sessionId,
              requestId: generateRequestId(),
              sequence: this.sequence++,
              timestamp: new Date().toISOString(),
              nonce: generateNonce(),
              type: "handshake.request",
              payload: {
                bootstrapRequestId: options.bootstrapRequestId,
                sessionId: this.sessionId,
                clientEphemeralPublicKey: this.keyPair.publicKeyPem,
                signature: "ephemeral-sig",
              },
            };

            const response = await this.sendRequest<DirectHandshakeResponsePayload>(handshakeReq);
            resolve(response);
          } catch (err) {
            reject(err);
          }
        },
      );

      this.socket.on("error", (err) => {
        reject(new DirectAgentError("transport-error", `Connection failed: ${err.message}`));
      });

      this.socket.on("data", (chunk: Buffer) => {
        this.handleIncomingData(chunk);
      });

      this.socket.on("close", () => {
        this.emit("close");
      });
    });
  }

  private handleIncomingData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 4) {
      const len = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + len) break;

      const frameBytes = this.buffer.subarray(4, 4 + len);
      this.buffer = this.buffer.subarray(4 + len);

      try {
        const envelope = JSON.parse(frameBytes.toString("utf8")) as DirectResponseEnvelope;
        const pending = this.pendingRequests.get(envelope.requestId);

        if (pending) {
          if (envelope.event === "error") {
            pending.reject(DirectAgentError.fromJSON(envelope.error));
            this.pendingRequests.delete(envelope.requestId);
          } else if (envelope.event === "result" || envelope.event === "finished") {
            if (pending.onStreamEvent) {
              pending.onStreamEvent(envelope);
            }
            pending.resolve(envelope.payload);
            this.pendingRequests.delete(envelope.requestId);
          } else {
            // Streaming intermediate event (started, stdout, stderr, progress, cancelled)
            if (pending.onStreamEvent) {
              pending.onStreamEvent(envelope);
            }
          }
        }
      } catch (err) {
        // ignore malformed frame
      }
    }
  }

  private sendRequest<T = any>(
    envelope: DirectRequestEnvelope,
    onStreamEvent?: (event: DirectResponseEnvelope) => void,
  ): Promise<T> {
    if (!this.socket || this.socket.destroyed) {
      return Promise.reject(new DirectAgentError("transport-error", "Direct client is not connected."));
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(envelope.requestId, { resolve, reject, onStreamEvent });
      const json = JSON.stringify(envelope);
      const payloadBuf = Buffer.from(json, "utf8");
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(payloadBuf.length, 0);
      this.socket?.write(Buffer.concat([lenBuf, payloadBuf]));
    });
  }

  async status(): Promise<Record<string, unknown>> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "status",
      payload: {},
    });
  }

  async inspectList(options: DirectInspectListRequestPayload = {}): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "inspect.list",
      payload: options,
    });
  }

  async inspectRead(path: string, options: Partial<DirectInspectReadRequestPayload> = {}): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "inspect.read",
      payload: { path, ...options },
    });
  }

  async inspectSearch(query: string, options: Partial<DirectInspectSearchRequestPayload> = {}): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "inspect.search",
      payload: { query, ...options },
    });
  }

  async gitStatus(options: { worktree?: string } = {}): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "git.status",
      payload: options,
    });
  }

  async exec(
    command: string,
    options: Partial<DirectExecRequestPayload> = {},
    onOutput?: (chunk: { stdout?: string; stderr?: string }) => void,
  ): Promise<{ exitCode: number; durationMs: number }> {
    return this.sendRequest(
      {
        protocol: DIRECT_PROTOCOL_VERSION,
        sessionId: this.sessionId,
        requestId: generateRequestId(),
        sequence: this.sequence++,
        timestamp: new Date().toISOString(),
        nonce: generateNonce(),
        type: "exec",
        payload: { command, ...options },
      },
      (event) => {
        if (event.event === "stdout" && onOutput) {
          onOutput({ stdout: (event.payload as any)?.text });
        } else if (event.event === "stderr" && onOutput) {
          onOutput({ stderr: (event.payload as any)?.text });
        }
      },
    );
  }

  async applyPatch(patch: string, options: Partial<DirectPatchApplyRequestPayload> = {}): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "patch.apply",
      payload: { patch, ...options },
    });
  }

  async coordinationDeclare(task: string, status = "active"): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "coordination.declare",
      payload: { agentId: this.sessionId, task, status },
    });
  }

  async coordinationHeartbeat(status = "active"): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "coordination.heartbeat",
      payload: { agentId: this.sessionId, status },
    });
  }

  async coordinationLock(
    kind: "path" | "module" | "ref",
    scope: string,
    options: { ttlMs?: number; note?: string; processBound?: boolean } = {},
  ): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "coordination.lock",
      payload: { kind, scope, ...options },
    });
  }

  async coordinationUnlock(kind: "path" | "module" | "ref", scope: string): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "coordination.unlock",
      payload: { kind, scope },
    });
  }

  async coordinationStatus(scope?: string): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "coordination.status",
      payload: { scope },
    });
  }

  async cancel(targetRequestId: string): Promise<any> {
    return this.sendRequest({
      protocol: DIRECT_PROTOCOL_VERSION,
      sessionId: this.sessionId,
      requestId: generateRequestId(),
      sequence: this.sequence++,
      timestamp: new Date().toISOString(),
      nonce: generateNonce(),
      type: "operation.cancel",
      payload: { targetRequestId },
    });
  }

  async close(): Promise<void> {
    try {
      await this.sendRequest({
        protocol: DIRECT_PROTOCOL_VERSION,
        sessionId: this.sessionId,
        requestId: generateRequestId(),
        sequence: this.sequence++,
        timestamp: new Date().toISOString(),
        nonce: generateNonce(),
        type: "session.close",
        payload: {},
      });
    } catch {
      // ignore
    } finally {
      this.socket?.destroy();
      this.socket = null;
    }
  }
}
