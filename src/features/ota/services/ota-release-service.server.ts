import "server-only";

import { createPublicKey, verify } from "node:crypto";

import { asolApi } from "@/core/api";
import { getOtaApprovalServerConfig } from "@/core/config/server-env";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import { otaReleaseRepository } from "@/modules/data-access/domains/ota/index.server";
import { compareOtaManifests } from "../utils/ota-release-diff";
import { compareOtaCanonicalStrings } from "../utils/ota-canonical-order";
import { isOtaRolloutEligible } from "../utils/ota-rollout";
import { summarizeOtaAdoption } from "../utils/ota-adoption";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import {
  canonicalOtaManifestPayload,
  legacyOtaManifestPayload,
} from "../utils/ota-signature-payload";
import type {
  OtaAdminDashboard,
  OtaIdentity,
  OtaManifest,
  OtaReleaseAccess,
  OtaReleaseDiff,
  SetOtaReleaseApprovalInput,
} from "../types/ota.types";

function assertManifest(manifest: OtaManifest): void {
  if (manifest.schemaVersion !== 2 || manifest.delivery !== "files")
    throw new Error("otaManifestInvalid");
  if (
    !manifest.releaseId ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)
  ) {
    throw new Error("otaManifestInvalid");
  }
  if (
    !manifest.signature ||
    Object.keys(manifest.files).length !== manifest.fileCount
  ) {
    throw new Error("otaManifestInvalid");
  }
  const deltas = manifest.bundles?.deltas ?? [];
  if (
    manifest.bundles &&
    (!Array.isArray(manifest.bundles.deltas) ||
      deltas.some((delta, index) =>
        !delta.fromVersion ||
        (index > 0 && compareOtaCanonicalStrings(deltas[index - 1]!.fromVersion, delta.fromVersion) >= 0)))
  ) throw new Error("otaManifestInvalid");
  for (const bundle of [manifest.bundles?.full, ...deltas]) {
    if (!bundle) continue;
    const normalized = bundle.path.replaceAll("\\", "/");
    if (
      !normalized ||
      normalized.startsWith("/") ||
      normalized.split("/").includes("..") ||
      !/^[a-f0-9]{64}$/i.test(bundle.sha256) ||
      !Number.isSafeInteger(bundle.size) ||
      bundle.size <= 0
    ) {
      throw new Error("otaManifestInvalid");
    }
  }
}

function manifestUrl(): string {
  return getOtaApprovalServerConfig().manifestUrl;
}

function verifyManifestSignature(manifest: OtaManifest): boolean {
  const encodedKey = getOtaApprovalServerConfig().publicKey;
  if (!encodedKey || !manifest.signature) return false;
  const publicKey = createPublicKey({
    key: Buffer.from(encodedKey, "base64"),
    format: "der",
    type: "spki",
  });
  const signature = Buffer.from(manifest.signature, "base64");
  const verifyPayload = (payload: string) =>
    verify(
      "sha256",
      Buffer.from(payload),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      signature,
    );
  if (verifyPayload(canonicalOtaManifestPayload(manifest))) return true;
  const legacyPayload = legacyOtaManifestPayload(manifest);
  return legacyPayload !== null && verifyPayload(legacyPayload);
}

async function fetchCurrentManifest(): Promise<OtaManifest> {
  const manifest = await asolApi.getAbsoluteJson<OtaManifest>(manifestUrl(), {
    cache: "no-store",
    suppressErrorLog: true,
  });
  assertManifest(manifest);
  if (!verifyManifestSignature(manifest))
    throw new Error("otaManifestSignatureInvalid");
  return manifest;
}

function assertAdmin(identity: OtaIdentity): void {
  if (!isSuperAdminIdentity(identity.uid, identity.phone))
    throw new Error("forbidden");
}

export const otaReleaseService = {
  async getAccess(input: {
    releaseId: string;
    version: string;
    identity?: OtaIdentity;
    installationId?: string;
  }): Promise<OtaReleaseAccess> {
    if (!input.releaseId || !input.version)
      throw new Error("otaReleaseIdentityRequired");
    const superAdmin = Boolean(
      input.identity &&
      isSuperAdminIdentity(input.identity.uid, input.identity.phone),
    );
    if (superAdmin) {
      return {
        releaseId: input.releaseId,
        version: input.version,
        allowed: true,
        approved: false,
        superAdmin: true,
        reason: "super_admin",
      };
    }

    const release = await otaReleaseRepository.getApproval(input.releaseId);
    const approved = Boolean(
      release?.version === input.version && release.approved,
    );
    const rolloutEligible = Boolean(
      approved && release && isOtaRolloutEligible(
        input.releaseId,
        input.installationId ?? "",
        release.rolloutPercentage,
      ),
    );
    return {
      releaseId: input.releaseId,
      version: input.version,
      allowed: rolloutEligible,
      approved,
      superAdmin: false,
      reason: !approved
        ? "awaiting_approval"
        : rolloutEligible
          ? "approved"
          : "rollout_pending",
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
      adoption: summarizeOtaAdoption(await persistentSystemLogService.list(1000)),
    };
  },

  async getReleaseDiff(input: {
    identity: OtaIdentity;
    baseReleaseId: string;
  }): Promise<OtaReleaseDiff> {
    assertAdmin(input.identity);
    if (!input.baseReleaseId) throw new Error("otaBaseReleaseRequired");
    const target = await fetchCurrentManifest();
    await otaReleaseRepository.discover(target);
    if (input.baseReleaseId === target.releaseId)
      throw new Error("otaBaseReleaseMatchesCurrent");
    const base = await otaReleaseRepository.getManifest(input.baseReleaseId);
    if (!base) throw new Error("otaReleaseNotFound");
    assertManifest(base);
    return compareOtaManifests(base, target);
  },

  async setApproval(
    input: SetOtaReleaseApprovalInput,
  ): Promise<OtaAdminDashboard> {
    assertAdmin(input.identity);
    const manifest = await fetchCurrentManifest();
    if (
      manifest.releaseId !== input.releaseId ||
      manifest.version !== input.version
    ) {
      throw new Error("otaReleaseNotCurrent");
    }
    const release = await otaReleaseRepository.discover(manifest);
    await otaReleaseRepository.setApproval({
      releaseId: input.releaseId,
      version: input.version,
      approved: input.approved,
      rolloutPercentage: input.rolloutPercentage ?? release.rolloutPercentage,
      actorUid: input.identity.uid,
    });
    return this.getAdminDashboard(input.identity);
  },
};
