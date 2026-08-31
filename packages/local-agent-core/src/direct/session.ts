import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DirectCapability } from "./capabilities";
import { DirectAgentError } from "./errors";
import { DIRECT_LIMITS } from "./protocol";
import {
  DIRECT_FILE_MODE,
  directActiveSessionsDir,
  directRevokedSessionsDir,
  ensureDirectDir,
} from "./paths";

export interface DirectSession {
  sessionId: string;
  agentId: string;
  bootstrapRequestId: string;
  consumedChallenge: string;
  capabilities: DirectCapability[];
  clientEphemeralPublicKey: string;
  serverEphemeralPublicKey: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  revoked: boolean;
  revokedAt?: string;
  revocationReason?: string;
}

export interface SessionGrantInput {
  sessionId: string;
  agentId: string;
  bootstrapRequestId: string;
  consumedChallenge: string;
  capabilities: DirectCapability[];
  clientEphemeralPublicKey: string;
  serverEphemeralPublicKey: string;
  lifetimeMs?: number;
}

export class SessionStore {
  constructor(
    private activeDir = directActiveSessionsDir(),
    private revokedDir = directRevokedSessionsDir(),
  ) {
    ensureDirectDir(this.activeDir);
    ensureDirectDir(this.revokedDir);
  }

  private activePath(sessionId: string): string {
    const safeId = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(this.activeDir, `${safeId}.json`);
  }

  private revokedPath(sessionId: string): string {
    const safeId = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(this.revokedDir, `${safeId}.json`);
  }

  createSession(input: SessionGrantInput, now = Date.now()): DirectSession {
    const createdAt = new Date(now).toISOString();
    const lifetimeMs = input.lifetimeMs ?? DIRECT_LIMITS.sessionMaxLifetimeMs;
    const expiresAt = new Date(now + lifetimeMs).toISOString();

    const session: DirectSession = {
      sessionId: input.sessionId,
      agentId: input.agentId,
      bootstrapRequestId: input.bootstrapRequestId,
      consumedChallenge: input.consumedChallenge,
      capabilities: [...input.capabilities],
      clientEphemeralPublicKey: input.clientEphemeralPublicKey,
      serverEphemeralPublicKey: input.serverEphemeralPublicKey,
      createdAt,
      expiresAt,
      lastActivityAt: createdAt,
      revoked: false,
    };

    ensureDirectDir(this.activeDir);
    writeFileSync(this.activePath(session.sessionId), JSON.stringify(session, null, 2), {
      mode: DIRECT_FILE_MODE,
      encoding: "utf8",
    });

    return session;
  }

  getSession(sessionId: string, now = Date.now()): DirectSession | null {
    // Check if explicitly revoked
    const revokedFile = this.revokedPath(sessionId);
    if (existsSync(revokedFile)) {
      try {
        const revokedSession = JSON.parse(readFileSync(revokedFile, "utf8")) as DirectSession;
        return revokedSession;
      } catch {
        // ignore
      }
    }

    const activeFile = this.activePath(sessionId);
    if (!existsSync(activeFile)) {
      return null;
    }

    try {
      const session = JSON.parse(readFileSync(activeFile, "utf8")) as DirectSession;
      return session;
    } catch {
      return null;
    }
  }

  validateActiveSession(sessionId: string, now = Date.now()): DirectSession {
    const session = this.getSession(sessionId, now);
    if (!session) {
      throw new DirectAgentError("unauthorized", `Session "${sessionId}" not found.`);
    }

    if (session.revoked) {
      throw new DirectAgentError(
        "session-revoked",
        `Session "${sessionId}" has been revoked: ${session.revocationReason || "no reason specified"}`,
        { sessionId, revokedAt: session.revokedAt },
      );
    }

    const expiresMs = Date.parse(session.expiresAt);
    if (Number.isFinite(expiresMs) && expiresMs <= now) {
      throw new DirectAgentError("session-expired", `Session "${sessionId}" has reached its maximum lifetime.`, {
        sessionId,
        expiresAt: session.expiresAt,
      });
    }

    const lastActiveMs = Date.parse(session.lastActivityAt);
    if (Number.isFinite(lastActiveMs) && now - lastActiveMs > DIRECT_LIMITS.sessionIdleTimeoutMs) {
      throw new DirectAgentError("session-expired", `Session "${sessionId}" has expired due to inactivity.`, {
        sessionId,
        lastActivityAt: session.lastActivityAt,
        idleTimeoutMs: DIRECT_LIMITS.sessionIdleTimeoutMs,
      });
    }

    return session;
  }

  touchSession(sessionId: string, now = Date.now()): void {
    const activeFile = this.activePath(sessionId);
    if (!existsSync(activeFile)) return;

    try {
      const session = JSON.parse(readFileSync(activeFile, "utf8")) as DirectSession;
      session.lastActivityAt = new Date(now).toISOString();
      writeFileSync(activeFile, JSON.stringify(session, null, 2), {
        mode: DIRECT_FILE_MODE,
        encoding: "utf8",
      });
    } catch {
      // ignore
    }
  }

  revokeSession(sessionId: string, reason = "Explicit revocation", now = Date.now()): boolean {
    const activeFile = this.activePath(sessionId);
    const revokedFile = this.revokedPath(sessionId);

    let session: DirectSession | null = null;
    if (existsSync(activeFile)) {
      try {
        session = JSON.parse(readFileSync(activeFile, "utf8")) as DirectSession;
        unlinkSync(activeFile);
      } catch {
        // ignore
      }
    }

    if (!session && existsSync(revokedFile)) {
      return true; // Already revoked
    }

    const updated: DirectSession = {
      ...(session ?? {
        sessionId,
        agentId: "unknown",
        bootstrapRequestId: "unknown",
        consumedChallenge: "unknown",
        capabilities: [],
        clientEphemeralPublicKey: "",
        serverEphemeralPublicKey: "",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now).toISOString(),
        lastActivityAt: new Date(now).toISOString(),
        revoked: true,
      }),
      revoked: true,
      revokedAt: new Date(now).toISOString(),
      revocationReason: reason,
    };

    ensureDirectDir(this.revokedDir);
    writeFileSync(revokedFile, JSON.stringify(updated, null, 2), {
      mode: DIRECT_FILE_MODE,
      encoding: "utf8",
    });

    return true;
  }

  revokeAllSessions(reason = "Revoke all requested", now = Date.now()): string[] {
    const activeSessions = this.listActiveSessions(now);
    const revokedIds: string[] = [];
    for (const session of activeSessions) {
      this.revokeSession(session.sessionId, reason, now);
      revokedIds.push(session.sessionId);
    }
    return revokedIds;
  }

  listActiveSessions(now = Date.now()): DirectSession[] {
    if (!existsSync(this.activeDir)) return [];
    const active: DirectSession[] = [];
    try {
      const files = readdirSync(this.activeDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const session = JSON.parse(readFileSync(path.join(this.activeDir, file), "utf8")) as DirectSession;
          if (!session.revoked) {
            const expiresMs = Date.parse(session.expiresAt);
            const lastActiveMs = Date.parse(session.lastActivityAt);
            const isExpired =
              (Number.isFinite(expiresMs) && expiresMs <= now) ||
              (Number.isFinite(lastActiveMs) && now - lastActiveMs > DIRECT_LIMITS.sessionIdleTimeoutMs);
            if (!isExpired) {
              active.push(session);
            }
          }
        } catch {
          // ignore corrupted
        }
      }
    } catch {
      // ignore
    }
    return active.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listRevokedSessions(): DirectSession[] {
    if (!existsSync(this.revokedDir)) return [];
    const revoked: DirectSession[] = [];
    try {
      const files = readdirSync(this.revokedDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const session = JSON.parse(readFileSync(path.join(this.revokedDir, file), "utf8")) as DirectSession;
          revoked.push(session);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    return revoked.sort((a, b) => (b.revokedAt ?? "").localeCompare(a.revokedAt ?? ""));
  }
}
