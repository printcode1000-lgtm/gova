import 'server-only';

import { createPublicKey, verify } from 'node:crypto';

import { asolApi } from '@/core/api';
import { getOtaApprovalServerConfig } from '@/core/config/server-env';
import { isSuperAdminIdentity } from '@/features/auth/utils/super-admin';
import { otaReleaseRepository } from '../repositories/ota-release-repository';
import { compareOtaManifests } from '../utils/ota-release-diff';
import type {
  OtaAdminDashboard,
  OtaIdentity,
  OtaManifest,
  OtaManifestPayload,
  OtaReleaseAccess,
  OtaReleaseDiff,
  SetOtaReleaseApprovalInput,
} from '../types/ota.types';

function sortedFiles(files: OtaManifestPayload['files']): OtaManifestPayload['files'] {
  return Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right)));
}

function canonicalPayload(manifest: OtaManifest): string {
  return JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    delivery: manifest.delivery,
    releaseId: manifest.releaseId,
    version: manifest.version,
    createdAt: manifest.createdAt,
    baseUrl: manifest.baseUrl,
    size: manifest.size,
    fileCount: manifest.fileCount,
    minimumNativeVersion: manifest.minimumNativeVersion,
    mandatory: manifest.mandatory,
    notes: manifest.notes,
    files: sortedFiles(manifest.files),
  });
}

function assertManifest(manifest: OtaManifest): void {
  if (manifest.schemaVersion !== 2 || manifest.delivery !== 'files') throw new Error('otaManifestInvalid');
  if (!manifest.releaseId || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error('otaManifestInvalid');
  }
  if (!manifest.signature || Object.keys(manifest.files).length !== manifest.fileCount) {
    throw new Error('otaManifestInvalid');
  }
}

function manifestUrl(): string {
  return getOtaApprovalServerConfig().manifestUrl;
}

function verifyManifestSignature(manifest: OtaManifest): boolean {
  const encodedKey = getOtaApprovalServerConfig().publicKey;
  if (!encodedKey || !manifest.signature) return false;
  const publicKey = createPublicKey({
    key: Buffer.from(encodedKey, 'base64'),
    format: 'der',
    type: 'spki',
  });
  return verify(
    'sha256',
    Buffer.from(canonicalPayload(manifest)),
    { key: publicKey, dsaEncoding: 'ieee-p1363' },
    Buffer.from(manifest.signature, 'base64'),
  );
}

async function fetchCurrentManifest(): Promise<OtaManifest> {
  const manifest = await asolApi.getAbsoluteJson<OtaManifest>(manifestUrl(), {
    cache: 'no-store',
    suppressErrorLog: true,
  });
  assertManifest(manifest);
  if (!verifyManifestSignature(manifest)) throw new Error('otaManifestSignatureInvalid');
  return manifest;
}

function assertAdmin(identity: OtaIdentity): void {
  if (!isSuperAdminIdentity(identity.uid, identity.phone)) throw new Error('forbidden');
}

export const otaReleaseService = {
  async getAccess(input: {
    releaseId: string;
    version: string;
    identity?: OtaIdentity;
  }): Promise<OtaReleaseAccess> {
    if (!input.releaseId || !input.version) throw new Error('otaReleaseIdentityRequired');
    const superAdmin = Boolean(
      input.identity && isSuperAdminIdentity(input.identity.uid, input.identity.phone),
    );
    if (superAdmin) {
      return {
        releaseId: input.releaseId,
        version: input.version,
        allowed: true,
        approved: false,
        superAdmin: true,
        reason: 'super_admin',
      };
    }

    const release = await otaReleaseRepository.getApproval(input.releaseId);
    const approved = Boolean(release?.version === input.version && release.approved);
    return {
      releaseId: input.releaseId,
      version: input.version,
      allowed: approved,
      approved,
      superAdmin: false,
      reason: approved ? 'approved' : 'awaiting_approval',
    };
  },

  async getAdminDashboard(identity: OtaIdentity): Promise<OtaAdminDashboard> {
    assertAdmin(identity);
    const manifest = await fetchCurrentManifest();
    const release = await otaReleaseRepository.discover(manifest);
    return {
      manifestUrl: manifestUrl(),
      current: { release, manifest, signatureVerified: true },
      history: await otaReleaseRepository.list(),
      audit: await otaReleaseRepository.listAudit(),
    };
  },

  async getReleaseDiff(input: {
    identity: OtaIdentity;
    baseReleaseId: string;
  }): Promise<OtaReleaseDiff> {
    assertAdmin(input.identity);
    if (!input.baseReleaseId) throw new Error('otaBaseReleaseRequired');
    const target = await fetchCurrentManifest();
    await otaReleaseRepository.discover(target);
    if (input.baseReleaseId === target.releaseId) throw new Error('otaBaseReleaseMatchesCurrent');
    const base = await otaReleaseRepository.getManifest(input.baseReleaseId);
    if (!base) throw new Error('otaReleaseNotFound');
    assertManifest(base);
    return compareOtaManifests(base, target);
  },

  async setApproval(input: SetOtaReleaseApprovalInput): Promise<OtaAdminDashboard> {
    assertAdmin(input.identity);
    const manifest = await fetchCurrentManifest();
    if (manifest.releaseId !== input.releaseId || manifest.version !== input.version) {
      throw new Error('otaReleaseNotCurrent');
    }
    await otaReleaseRepository.discover(manifest);
    await otaReleaseRepository.setApproval({
      releaseId: input.releaseId,
      version: input.version,
      approved: input.approved,
      actorUid: input.identity.uid,
    });
    return this.getAdminDashboard(input.identity);
  },
};
