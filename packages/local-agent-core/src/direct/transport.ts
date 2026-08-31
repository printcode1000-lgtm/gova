import { EventEmitter } from "node:events";
import { createServer, Server as TlsServer, TLSSocket, connect as tlsConnect } from "node:tls";

import { assertCapabilities, operationRequiredCapabilities } from "./capabilities";
import { createSharedSecretProof, deriveSharedSecret, directHandshakeProofMessage, directServerIdentityProofMessage, generateOrLoadTlsCredentials, loadOrCreateHostIdentityKey, signData, verifySharedSecretProof, TlsCredentials } from "./crypto";
import { DirectAgentError } from "./errors";
import {
  executeCoordinationDeclare,
  executeCoordinationHeartbeat,
  executeCoordinationLock,
  executeCoordinationStatus,
  executeCoordinationUnlock,
  executeExec,
  executeGitStatus,
  executeInspectList,
  executeInspectRead,
  executeInspectSearch,
  executePatchApply,
  executeStatus,
} from "./execution";
import { hostIdentifier } from "./paths";
import {
  DIRECT_LIMITS,
  DIRECT_PROTOCOL_VERSION,
  DirectHandshakeRequestPayload,
  DirectHandshakeResponsePayload,
  DirectRequestEnvelope,
  DirectResponseEnvelope,
  validateRequestEnvelope,
} from "./protocol";
import { ReplayCache } from "./replay-cache";
import { DirectSession, SessionStore } from "./session";

export interface DirectServerOptions {
  port: number;
  bindHost?: string;
  sessionStore: SessionStore;
  replayCache: ReplayCache;
  tlsCredentials?: TlsCredentials;
}

export class DirectAgentServer extends EventEmitter {
  private server: TlsServer | null = null;
  private activeControllers = new Map<string, AbortController>(); // requestId -> AbortController
  private tlsCreds: TlsCredentials;

  constructor(private options: DirectServerOptions) {
    super();
    this.tlsCreds = options.tlsCredentials ?? generateOrLoadTlsCredentials();
  }

  async start(): Promise<{ port: number; bindHost: string }> {
    const bindHost = this.options.bindHost ?? "0.0.0.0";
    const port = this.options.port;

    return new Promise((resolve, reject) => {
      this.server = createServer(
        {
          key: this.tlsCreds.key,
          cert: this.tlsCreds.cert,
          minVersion: "TLSv1.3",
        },
        (socket: TLSSocket) => this.handleClientSocket(socket),
      );

      this.server.once("error", reject);
      this.server.listen(port, bindHost, () => {
        const addr = this.server?.address();
        const boundPort = typeof addr === "object" && addr ? addr.port : port;
        this.emit("listening", { port: boundPort, bindHost });
        resolve({ port: boundPort, bindHost });
      });
    });
  }

  async stop(): Promise<void> {
    for (const controller of this.activeControllers.values()) {
      controller.abort();
    }
    this.activeControllers.clear();

    if (this.server) {
      return new Promise((resolve) => {
        this.server?.close(() => resolve());
        this.server = null;
      });
    }
  }

  private handleClientSocket(socket: TLSSocket): void {
    let session: DirectSession | null = null;
    let buffer = Buffer.alloc(0);

    const sendEnvelope = (envelope: DirectResponseEnvelope) => {
      if (socket.destroyed || !socket.writable) return;
      const json = JSON.stringify(envelope);
      const payloadBuf = Buffer.from(json, "utf8");
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(payloadBuf.length, 0);
      socket.write(Buffer.concat([lenBuf, payloadBuf]));
    };

    const sendError = (requestId: string, sequence: number, err: unknown) => {
      const directError =
        err instanceof DirectAgentError
          ? err
          : new DirectAgentError("internal-error", err instanceof Error ? err.message : String(err));
      sendEnvelope({
        protocol: DIRECT_PROTOCOL_VERSION,
        sessionId: session?.sessionId ?? "unknown",
        requestId,
        sequence,
        timestamp: new Date().toISOString(),
        event: "error",
        error: directError.toJSON(),
      });
    };

    socket.on("data", async (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 4) {
        const messageLength = buffer.readUInt32BE(0);
        if (messageLength > DIRECT_LIMITS.maxRequestBodyBytes) {
          sendError("unknown", 0, new DirectAgentError("invalid-message", "Frame exceeds maximum allowed body size."));
          socket.destroy();
          return;
        }

        if (buffer.length < 4 + messageLength) {
          break; // wait for more data
        }

        const messageBytes = buffer.subarray(4, 4 + messageLength);
        buffer = buffer.subarray(4 + messageLength);

        let parsed: unknown;
        try {
          parsed = JSON.parse(messageBytes.toString("utf8"));
        } catch {
          sendError("unknown", 0, new DirectAgentError("invalid-message", "Invalid JSON message frame."));
          continue;
        }

        const validation = validateRequestEnvelope(parsed);
        if (!validation.valid || !validation.envelope) {
          sendError("unknown", 0, new DirectAgentError("invalid-message", validation.error ?? "Invalid envelope."));
          continue;
        }

        const req = validation.envelope;

        try {
          // Process Handshake
          if (req.type === "handshake.request") {
            const payload = req.payload as DirectHandshakeRequestPayload;
            const validSession = this.options.sessionStore.validateActiveSession(payload.sessionId);

            if (validSession.bootstrapRequestId !== payload.bootstrapRequestId) {
              throw new DirectAgentError("unauthorized", "Bootstrap request ID does not match session grant.");
            }
            if (payload.clientEphemeralPublicKey !== validSession.clientEphemeralPublicKey) {
              throw new DirectAgentError("unauthorized", "Client ephemeral key does not match the GitHub-authorized bootstrap key.");
            }
            if (!validSession.serverEphemeralPrivateKey) {
              throw new DirectAgentError("unauthorized", "Session is missing its machine-local server ephemeral key.");
            }
            const timestampMs = Date.parse(req.timestamp);
            if (!this.options.replayCache.checkAndRecordNonce(req.nonce, timestampMs)) {
              throw new DirectAgentError("replay-detected", "Handshake nonce is duplicated or stale.");
            }
            if (!this.options.replayCache.checkAndUpdateSequence(validSession.sessionId, req.sequence)) {
              throw new DirectAgentError("replay-detected", "Handshake sequence is not strictly increasing.");
            }
            const sharedSecret = deriveSharedSecret(validSession.serverEphemeralPrivateKey, validSession.clientEphemeralPublicKey);
            const proofMessage = directHandshakeProofMessage({
              sessionId: validSession.sessionId,
              bootstrapRequestId: validSession.bootstrapRequestId,
              challenge: validSession.consumedChallenge,
              nonce: req.nonce,
              clientEphemeralPublicKey: validSession.clientEphemeralPublicKey,
            });
            if (!verifySharedSecretProof(sharedSecret, proofMessage, payload.signature)) {
              throw new DirectAgentError("unauthorized", "Client failed X25519 shared-secret proof.");
            }

            session = validSession;
            const identityKey = loadOrCreateHostIdentityKey();
            const challengeSignData = directServerIdentityProofMessage({
              challenge: session.consumedChallenge,
              sessionId: session.sessionId,
              nonce: req.nonce,
              serverEphemeralPublicKey: session.serverEphemeralPublicKey,
            });
            const serverSig = signData(identityKey.privateKeyPem, challengeSignData);

            const responsePayload: DirectHandshakeResponsePayload = {
              status: "authenticated",
              sessionId: session.sessionId,
              agentId: session.agentId,
              expiresAt: session.expiresAt,
              capabilities: session.capabilities,
              serverIdentity: {
                hostId: hostIdentifier(),
                serverKeyId: identityKey.serverKeyId,
                signature: serverSig,
              },
            };

            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: responsePayload,
            });
            continue;
          }

          // Non-handshake operations require an authenticated session
          if (!session) {
            throw new DirectAgentError("unauthorized", "Handshake required before executing operations.");
          }

          // Validate session freshness and update last activity
          session = this.options.sessionStore.validateActiveSession(session.sessionId);
          this.options.sessionStore.touchSession(session.sessionId);

          // Validate replay protection: monotonic sequence & nonce freshness
          const timestampMs = Date.parse(req.timestamp);
          if (!this.options.replayCache.checkAndRecordNonce(req.nonce, timestampMs)) {
            throw new DirectAgentError("replay-detected", `Duplicate or stale nonce detected: ${req.nonce}`);
          }
          if (!this.options.replayCache.checkAndUpdateSequence(session.sessionId, req.sequence)) {
            throw new DirectAgentError("replay-detected", "Request sequence is not strictly increasing.");
          }

          // Capability check
          const requiredCaps = operationRequiredCapabilities(req.type, req.payload);
          assertCapabilities(session.capabilities, requiredCaps);

          // Handle Operation Cancel
          if (req.type === "operation.cancel") {
            const cancelPayload = req.payload as { targetRequestId: string };
            const controller = this.activeControllers.get(cancelPayload.targetRequestId);
            if (controller) {
              controller.abort();
              this.activeControllers.delete(cancelPayload.targetRequestId);
            }
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: { cancelled: Boolean(controller) },
            });
            continue;
          }

          // Handle Session Close
          if (req.type === "session.close") {
            this.options.sessionStore.revokeSession(session.sessionId, "Closed by client");
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: { closed: true },
            });
            socket.end();
            return;
          }

          // Dispatch Operations
          if (req.type === "status") {
            const result = await executeStatus(session);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "inspect.list") {
            const result = await executeInspectList(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "inspect.read") {
            const result = await executeInspectRead(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "inspect.search") {
            const result = await executeInspectSearch(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "git.status") {
            const result = await executeGitStatus(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "exec") {
            const controller = new AbortController();
            this.activeControllers.set(req.requestId, controller);
            try {
              await executeExec(session, req.requestId, req.payload as any, sendEnvelope, controller.signal);
            } finally {
              this.activeControllers.delete(req.requestId);
            }
          } else if (req.type === "patch.apply") {
            const result = await executePatchApply(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "coordination.declare") {
            const result = await executeCoordinationDeclare(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "coordination.heartbeat") {
            const result = await executeCoordinationHeartbeat(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "coordination.lock") {
            const result = await executeCoordinationLock(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "coordination.unlock") {
            const result = await executeCoordinationUnlock(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          } else if (req.type === "coordination.status") {
            const result = await executeCoordinationStatus(session, req.payload as any);
            sendEnvelope({
              protocol: DIRECT_PROTOCOL_VERSION,
              sessionId: session.sessionId,
              requestId: req.requestId,
              sequence: req.sequence + 1,
              timestamp: new Date().toISOString(),
              event: "result",
              payload: result,
            });
          }
        } catch (err) {
          sendError(req.requestId, req.sequence + 1, err);
        }
      }
    });

    socket.on("error", () => {
      // client connection error
    });
  }
}
