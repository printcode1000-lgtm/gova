import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DIRECT_FILE_MODE, directConsumedBootstrapDir, ensureDirectDir } from "./paths";

export interface ConsumedRecord {
  id: string;
  type: "request" | "challenge";
  consumedAt: string;
  expiresAt: string;
  meta?: Record<string, unknown>;
}

export const REPLAY_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ReplayCache {
  private inMemoryConsumed = new Set<string>();
  private messageNonces = new Map<string, number>(); // nonce -> timestamp
  private sessionSequences = new Map<string, number>(); // sessionId -> highest sequence number

  constructor(private storageDir = directConsumedBootstrapDir()) {
    ensureDirectDir(this.storageDir);
    this.loadFromDisk();
  }

  private recordPath(id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(this.storageDir, `${safeId}.json`);
  }

  private loadFromDisk(): void {
    if (!existsSync(this.storageDir)) return;
    const now = Date.now();
    try {
      const files = readdirSync(this.storageDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(this.storageDir, file);
        try {
          const content = JSON.parse(readFileSync(filePath, "utf8")) as ConsumedRecord;
          const expiresMs = Date.parse(content.expiresAt);
          if (Number.isFinite(expiresMs) && expiresMs > now) {
            this.inMemoryConsumed.add(content.id);
          } else {
            // Expired record, prune
            unlinkSync(filePath);
          }
        } catch {
          // ignore corrupted single file
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * Check if a bootstrap requestId or challengeId has already been consumed.
   */
  hasConsumed(id: string): boolean {
    if (this.inMemoryConsumed.has(id)) return true;
    const filePath = this.recordPath(id);
    if (existsSync(filePath)) {
      try {
        const content = JSON.parse(readFileSync(filePath, "utf8")) as ConsumedRecord;
        const expiresMs = Date.parse(content.expiresAt);
        if (Number.isFinite(expiresMs) && expiresMs > Date.now()) {
          this.inMemoryConsumed.add(id);
          return true;
        }
      } catch {
        // ignore
      }
    }
    return false;
  }

  /**
   * Mark a bootstrap requestId or challengeId as consumed and persist to disk.
   */
  consume(id: string, type: "request" | "challenge", meta?: Record<string, unknown>, retentionMs = REPLAY_RETENTION_MS): void {
    this.inMemoryConsumed.add(id);
    const now = Date.now();
    const record: ConsumedRecord = {
      id,
      type,
      consumedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + retentionMs).toISOString(),
      meta,
    };
    const filePath = this.recordPath(id);
    ensureDirectDir(this.storageDir);
    writeFileSync(filePath, JSON.stringify(record, null, 2), { mode: DIRECT_FILE_MODE, encoding: "utf8" });
  }

  /**
   * Check and record a message nonce for a session.
   * Returns true if nonce is fresh, false if duplicate.
   */
  checkAndRecordNonce(nonce: string, timestampMs: number, maxAgeMs = 5 * 60 * 1000): boolean {
    const now = Date.now();
    if (Math.abs(now - timestampMs) > maxAgeMs) {
      return false; // Timestamp outside freshness window
    }

    if (this.messageNonces.has(nonce)) {
      return false; // Replay detected
    }

    this.messageNonces.set(nonce, now);
    // Periodically prune in-memory nonces
    if (this.messageNonces.size > 10000) {
      this.pruneNonces(now - maxAgeMs);
    }
    return true;
  }

  /**
   * Check and update the monotonic sequence number for a session.
   * Returns true if sequence > previous sequence, false otherwise.
   */
  checkAndUpdateSequence(sessionId: string, sequence: number): boolean {
    const current = this.sessionSequences.get(sessionId) ?? -1;
    if (sequence <= current) {
      return false;
    }
    this.sessionSequences.set(sessionId, sequence);
    return true;
  }

  private pruneNonces(cutoff: number): void {
    for (const [nonce, time] of this.messageNonces.entries()) {
      if (time < cutoff) {
        this.messageNonces.delete(nonce);
      }
    }
  }

  /**
   * Prune all expired records on disk.
   */
  pruneExpired(now = Date.now()): number {
    let pruned = 0;
    try {
      const files = readdirSync(this.storageDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(this.storageDir, file);
        try {
          const content = JSON.parse(readFileSync(filePath, "utf8")) as ConsumedRecord;
          const expiresMs = Date.parse(content.expiresAt);
          if (Number.isFinite(expiresMs) && expiresMs <= now) {
            unlinkSync(filePath);
            this.inMemoryConsumed.delete(content.id);
            pruned++;
          }
        } catch {
          // corrupted file, remove
          try {
            unlinkSync(filePath);
            pruned++;
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
    return pruned;
  }
}
