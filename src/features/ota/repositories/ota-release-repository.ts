import 'server-only';

import { desc, eq } from 'drizzle-orm';

import { dbClient } from '@/core/database/db-client';
import type { IDatabaseClient } from '@/core/database/database-client.interface';
import {
  otaReleaseAudit,
  otaReleases,
  type NewOtaReleaseAuditEntity,
  type NewOtaReleaseEntity,
  type OtaReleaseAuditEntity,
  type OtaReleaseEntity,
} from '@/core/database/schema';
import type {
  OtaManifest,
  OtaReleaseAuditEntry,
  OtaReleaseSummary,
} from '../types/ota.types';

export class OtaReleaseRepository {
  constructor(private readonly database: IDatabaseClient = dbClient) {}

  async getApproval(releaseId: string): Promise<{ version: string; approved: boolean } | null> {
    const rows = await this.database.db
      .select({ version: otaReleases.version, approved: otaReleases.approved })
      .from(otaReleases)
      .where(eq(otaReleases.releaseId, releaseId))
      .limit(1);
    return rows[0] ?? null;
  }

  async get(releaseId: string): Promise<OtaReleaseSummary | null> {
    const rows = await this.database.db
      .select()
      .from(otaReleases)
      .where(eq(otaReleases.releaseId, releaseId))
      .limit(1);
    return rows[0] ? toSummary(rows[0]) : null;
  }

  async getManifest(releaseId: string): Promise<OtaManifest | null> {
    const rows = await this.database.db
      .select({ manifestJson: otaReleases.manifestJson })
      .from(otaReleases)
      .where(eq(otaReleases.releaseId, releaseId))
      .limit(1);
    if (!rows[0]) return null;
    try {
      return JSON.parse(rows[0].manifestJson) as OtaManifest;
    } catch {
      throw new Error('otaStoredManifestInvalid');
    }
  }

  async discover(manifest: OtaManifest): Promise<OtaReleaseSummary> {
    const current = await this.get(manifest.releaseId);
    const now = new Date().toISOString();
    const metadata = {
      version: manifest.version,
      manifestCreatedAt: manifest.createdAt,
      baseUrl: manifest.baseUrl,
      size: manifest.size,
      fileCount: manifest.fileCount,
      minimumNativeVersion: manifest.minimumNativeVersion,
      mandatory: manifest.mandatory,
      notes: manifest.notes,
      signature: manifest.signature ?? '',
      manifestJson: JSON.stringify(manifest),
      lastSeenAt: now,
    };

    if (current) {
      await this.database.db
        .update(otaReleases)
        .set(metadata)
        .where(eq(otaReleases.releaseId, manifest.releaseId));
    } else {
      const row: NewOtaReleaseEntity = {
        releaseId: manifest.releaseId,
        ...metadata,
        approved: false,
        discoveredAt: now,
      };
      await this.database.db.insert(otaReleases).values(row);
      await this.addAudit({
        releaseId: manifest.releaseId,
        version: manifest.version,
        action: 'discovered',
      });
    }

    const saved = await this.get(manifest.releaseId);
    if (!saved) throw new Error('otaReleaseSaveFailed');
    return saved;
  }

  async setApproval(input: {
    releaseId: string;
    version: string;
    approved: boolean;
    actorUid: string;
  }): Promise<OtaReleaseSummary> {
    const current = await this.get(input.releaseId);
    if (!current || current.version !== input.version) throw new Error('otaReleaseNotFound');
    if (current.approved === input.approved) return current;

    const now = new Date().toISOString();
    await this.database.db
      .update(otaReleases)
      .set(
        input.approved
          ? {
              approved: true,
              approvedAt: now,
              approvedByUid: input.actorUid,
              revokedAt: null,
              revokedByUid: null,
            }
          : {
              approved: false,
              revokedAt: now,
              revokedByUid: input.actorUid,
            },
      )
      .where(eq(otaReleases.releaseId, input.releaseId));

    await this.addAudit({
      releaseId: input.releaseId,
      version: input.version,
      action: input.approved ? 'approved' : 'revoked',
      actorUid: input.actorUid,
    });

    const saved = await this.get(input.releaseId);
    if (!saved) throw new Error('otaReleaseSaveFailed');
    return saved;
  }

  async list(limit = 50): Promise<OtaReleaseSummary[]> {
    const rows = await this.database.db
      .select()
      .from(otaReleases)
      .orderBy(desc(otaReleases.manifestCreatedAt))
      .limit(limit);
    return rows.map(toSummary);
  }

  async listAudit(limit = 100): Promise<OtaReleaseAuditEntry[]> {
    const rows = await this.database.db
      .select()
      .from(otaReleaseAudit)
      .orderBy(desc(otaReleaseAudit.createdAt))
      .limit(limit);
    return rows.map(toAuditEntry);
  }

  private async addAudit(input: {
    releaseId: string;
    version: string;
    action: OtaReleaseAuditEntry['action'];
    actorUid?: string;
  }): Promise<void> {
    const row: NewOtaReleaseAuditEntity = {
      id: crypto.randomUUID(),
      releaseId: input.releaseId,
      version: input.version,
      action: input.action,
      actorUid: input.actorUid,
      createdAt: new Date().toISOString(),
    };
    await this.database.db.insert(otaReleaseAudit).values(row);
  }
}

export const otaReleaseRepository = new OtaReleaseRepository();

function toSummary(row: OtaReleaseEntity): OtaReleaseSummary {
  return {
    releaseId: row.releaseId,
    version: row.version,
    manifestCreatedAt: row.manifestCreatedAt,
    baseUrl: row.baseUrl,
    size: row.size,
    fileCount: row.fileCount,
    minimumNativeVersion: row.minimumNativeVersion,
    mandatory: row.mandatory,
    notes: row.notes,
    signature: row.signature,
    approved: row.approved,
    approvedAt: row.approvedAt ?? undefined,
    approvedByUid: row.approvedByUid ?? undefined,
    revokedAt: row.revokedAt ?? undefined,
    revokedByUid: row.revokedByUid ?? undefined,
    discoveredAt: row.discoveredAt,
    lastSeenAt: row.lastSeenAt,
  };
}

function toAuditEntry(row: OtaReleaseAuditEntity): OtaReleaseAuditEntry {
  return {
    id: row.id,
    releaseId: row.releaseId,
    version: row.version,
    action: row.action,
    actorUid: row.actorUid ?? undefined,
    createdAt: row.createdAt,
  };
}
