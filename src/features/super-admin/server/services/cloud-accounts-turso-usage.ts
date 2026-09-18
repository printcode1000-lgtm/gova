import {
  readTursoOrganizationIdentity,
  readTursoOrganizationLiveUsage,
} from "@asol/data-core/turso-platform";

import type { TursoCloudAccountUsage } from "../../presentation/cloud-accounts-facts.types";
import type { TursoOrganizationKeys } from "./cloud-accounts-turso-organizations";

/** Quotas used only when the provider does not report the current plan's own. */
const FALLBACK_LIMITS = {
  rowsRead: 500_000_000,
  rowsWritten: 10_000_000,
  storageBytes: 5_000_000_000,
  bytesSynced: 3_000_000_000,
  databases: 100,
  locations: 3,
  groups: 1,
} as const;

export type TursoOrganizationRow = TursoCloudAccountUsage & { readonly id: string };

type EnvReader = (key: string) => string | undefined;

function quota(value: number | null, fallback: number): number {
  return value !== null && value > 0 ? value : fallback;
}

/** A row with no reading: the fallback quotas and why nothing was read. */
export function unavailableTursoRow(
  id: string,
  status: "missingCredentials" | "apiError",
  message: string | null,
): TursoOrganizationRow {
  return {
    id,
    status,
    capturedAt: null,
    billingPeriodStart: null,
    billingPeriodEnd: null,
    plan: null,
    overages: null,
    ownerEmail: null,
    ownerUsername: null,
    cloudDatabaseNames: [],
    rowsRead: null,
    rowsReadLimit: FALLBACK_LIMITS.rowsRead,
    rowsWritten: null,
    rowsWrittenLimit: FALLBACK_LIMITS.rowsWritten,
    storageBytes: null,
    storageBytesLimit: FALLBACK_LIMITS.storageBytes,
    bytesSynced: null,
    bytesSyncedLimit: FALLBACK_LIMITS.bytesSynced,
    inputBytes: null,
    outputBytes: null,
    databases: null,
    databasesLimit: FALLBACK_LIMITS.databases,
    locations: null,
    locationsLimit: FALLBACK_LIMITS.locations,
    groups: null,
    groupsLimit: FALLBACK_LIMITS.groups,
    message,
  };
}

function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "tursoUsageFailed";
  return error.message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

/**
 * One Turso organization, read now: usage and plan quotas, plus the token
 * owner's login and the organization's database names. Keyed by the
 * organization name from the environment. Shared by the live
 * `/dev/cloud-accounts` read and the `cloud-accounts:turso-usage` snapshot, so
 * both describe an organization identically; tokens never leave this function.
 */
export async function readTursoOrganizationRow(
  keys: TursoOrganizationKeys,
  readEnv: EnvReader,
  capturedAt: string,
): Promise<TursoOrganizationRow> {
  const organization = readEnv(keys.organizationEnv)?.trim() ?? "";
  const apiToken = readEnv(keys.tokenEnv)?.trim() ?? "";
  const id = organization || keys.organizationEnv;
  if (!organization || !apiToken) {
    return unavailableTursoRow(id, "missingCredentials", `missing ${keys.organizationEnv} / ${keys.tokenEnv}`);
  }
  const [liveResult, identityResult] = await Promise.allSettled([
    readTursoOrganizationLiveUsage({ organization, apiToken }),
    readTursoOrganizationIdentity({ organization, apiToken }),
  ]);
  const identity =
    identityResult.status === "fulfilled"
      ? {
          ownerEmail: identityResult.value.ownerEmail,
          ownerUsername: identityResult.value.ownerUsername,
          cloudDatabaseNames: identityResult.value.databaseNames,
        }
      : {};
  if (liveResult.status === "rejected") {
    return {
      ...unavailableTursoRow(id, "apiError", safeErrorMessage(liveResult.reason)),
      ...identity,
      capturedAt,
    };
  }
  const live = liveResult.value;
  return {
    id,
    status: identityResult.status === "fulfilled" ? "ok" : "apiError",
    capturedAt,
    billingPeriodStart: live.plan.billingPeriodStart,
    billingPeriodEnd: live.plan.billingPeriodEnd,
    plan: live.plan.name,
    overages: live.plan.overages,
    ownerEmail: null,
    ownerUsername: null,
    cloudDatabaseNames: [],
    ...identity,
    rowsRead: live.usage.rowsRead,
    rowsReadLimit: quota(live.plan.quotas.rowsRead, FALLBACK_LIMITS.rowsRead),
    rowsWritten: live.usage.rowsWritten,
    rowsWrittenLimit: quota(live.plan.quotas.rowsWritten, FALLBACK_LIMITS.rowsWritten),
    storageBytes: live.usage.storageBytes,
    storageBytesLimit: quota(live.plan.quotas.storageBytes, FALLBACK_LIMITS.storageBytes),
    bytesSynced: live.usage.bytesSynced,
    bytesSyncedLimit: quota(live.plan.quotas.bytesSynced, FALLBACK_LIMITS.bytesSynced),
    inputBytes: live.usage.inputBytes,
    outputBytes: live.usage.outputBytes,
    databases: live.usage.databases,
    databasesLimit: quota(live.plan.quotas.databases, FALLBACK_LIMITS.databases),
    locations: live.usage.locations,
    locationsLimit: quota(live.plan.quotas.locations, FALLBACK_LIMITS.locations),
    groups: live.usage.groups,
    groupsLimit: quota(live.plan.quotas.groups, FALLBACK_LIMITS.groups),
    message:
      identityResult.status === "rejected" ? safeErrorMessage(identityResult.reason) : null,
  };
}
