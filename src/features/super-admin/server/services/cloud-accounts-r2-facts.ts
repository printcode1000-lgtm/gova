import { getOtaPrefix } from "@asol/ota-core/publishing";
import { getAllStorageAccounts } from "@asol/storage-core";
import {
  getAllStorageProfiles,
  R2AccountProvider,
  resolveStorageProvider,
} from "@asol/storage-core/server";

import type {
  R2AccountFacts,
  StorageDestinationFacts,
} from "../../presentation/cloud-accounts-facts.types";
import { R2_CONTENTS_SNAPSHOT } from "../../presentation/cloud-accounts-r2-contents-snapshot";
import { OTA_R2_CLOUD_ACCOUNT } from "./cloud-accounts-ota-account";
import { R2_USAGE_SNAPSHOT } from "../../presentation/cloud-accounts-r2-usage-snapshot";

const USAGE_BY_ID: Record<string, R2AccountFacts["usage"]> = R2_USAGE_SNAPSHOT;
const CONTENTS_BY_ID: Record<string, R2AccountFacts["contents"]> = R2_CONTENTS_SNAPSHOT;

function snapshotsFor(id: string): Pick<R2AccountFacts, "usage" | "contents"> {
  const usage = USAGE_BY_ID[id];
  const contents = CONTENTS_BY_ID[id];
  if (!usage || !contents) {
    throw new Error(`[cloud-accounts] R2 account "${id}" has no usage or contents snapshot.`);
  }
  return { usage, contents };
}

/**
 * Each storage profile resolved through the storage pipeline to the R2 account
 * its provider writes to — the same resolution an upload performs.
 */
function profileAccounts() {
  return getAllStorageProfiles().map((profile) => {
    const provider = resolveStorageProvider(profile.provider);
    if (!(provider instanceof R2AccountProvider)) {
      throw new Error(
        `[cloud-accounts] storage profile "${profile.id}" resolves to a non-R2 provider "${provider.providerId}".`,
      );
    }
    return { profile, providerId: provider.providerId, r2AccountId: provider.accountId as string };
  });
}

/** The provider ids that resolve to one account, or `null` when no profile uses it. */
function targetOf(accountId: string): string | null {
  const ids = [
    ...new Set(
      profileAccounts()
        .filter((entry) => entry.r2AccountId === accountId)
        .map((entry) => entry.providerId),
    ),
  ];
  return ids.length > 0 ? ids.join(", ") : null;
}

/** Storage-registry accounts first, then the OTA bucket `@asol/ota-core` owns. */
export function listR2AccountFacts(otaPackage: string): readonly R2AccountFacts[] {
  const registry = getAllStorageAccounts().map((account) => ({
    id: account.id,
    accountId: account.accountId,
    email: account.email,
    bucketName: account.bucketName,
    publicUrl: account.publicUrl,
    envPrefix: account.envPrefix,
    target: targetOf(account.id),
    ...snapshotsFor(account.id),
  }));
  return [
    ...registry,
    {
      id: OTA_R2_CLOUD_ACCOUNT.id,
      accountId: OTA_R2_CLOUD_ACCOUNT.accountId,
      email: OTA_R2_CLOUD_ACCOUNT.email,
      bucketName: OTA_R2_CLOUD_ACCOUNT.bucketName,
      publicUrl: OTA_R2_CLOUD_ACCOUNT.publicUrl,
      envPrefix: OTA_R2_CLOUD_ACCOUNT.envPrefix,
      target: otaPackage,
      ...snapshotsFor(OTA_R2_CLOUD_ACCOUNT.id),
    },
  ];
}

/** Where each storage profile, and the OTA publisher, write their objects. */
export function listStorageDestinations(otaPackage: string): readonly StorageDestinationFacts[] {
  return [
    ...profileAccounts().map(({ profile, r2AccountId }) => ({
      source: profile.id,
      r2AccountId,
      folder: profile.folder,
    })),
    { source: otaPackage, r2AccountId: OTA_R2_CLOUD_ACCOUNT.id, folder: `${getOtaPrefix()}/` },
  ];
}
