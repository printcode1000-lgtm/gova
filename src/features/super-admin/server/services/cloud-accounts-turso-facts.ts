import {
  ACCOUNT_DECLARATIONS,
  type AccountDeclaration,
} from "@asol/account-declarations";

import type {
  TursoAccountFacts,
  TursoCloudAccountUsage,
  TursoUnassignedDatabase,
} from "../../presentation/cloud-accounts-facts.types";
import { TURSO_USAGE_SNAPSHOT } from "../../presentation/cloud-accounts-turso-usage-snapshot";
import { listTursoOrganizationKeys } from "./cloud-accounts-turso-organizations";
import { unavailableTursoRow } from "./cloud-accounts-turso-usage";

/**
 * Names-only view of the logical databases, read from the desired-schema
 * manifests by the development route (runtime layers may not import them).
 */
export type TursoDatabaseInventory = {
  readonly tablesByDatabase: Readonly<Record<string, readonly string[]>>;
  readonly credentialKeysByDatabase: Readonly<Record<string, readonly string[]>>;
};

export type EnvReader = (key: string) => string | undefined;

/**
 * A database is read by every deployment whose declared environment carries its
 * credentials — the same key names schema sync resolves.
 */
function readersOf(credentialKeys: readonly string[]): string[] {
  return (Object.values(ACCOUNT_DECLARATIONS) as AccountDeclaration[])
    .filter((declaration) =>
      [...declaration.requiredEnv, ...declaration.optionalEnv].some((key) =>
        credentialKeys.includes(key),
      ),
    )
    .map((declaration) => declaration.project);
}

/** `libsql://<database>-<organization>.<region>.turso.io` → its first host label. */
function hostLabel(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

function snapshotFor(organization: string): TursoCloudAccountUsage {
  const row = TURSO_USAGE_SNAPSHOT[organization];
  if (row) return row;
  const { id: _id, ...empty } = unavailableTursoRow(organization, "missingCredentials", null);
  return empty;
}

/**
 * Turso organizations and the databases each one holds, as configured.
 *
 * Organizations are the environment contract's `TURSO_*ORGANIZATION` keys, named
 * by their values. A logical database belongs to the organization its configured
 * URL points at — the URL host is `<database>-<organization>` — so the page shows
 * where each database really is, not where someone last wrote it was.
 */
export function listTursoAccountFacts(
  inventory: TursoDatabaseInventory,
  readEnv: EnvReader,
): { readonly accounts: readonly TursoAccountFacts[]; readonly unassigned: readonly TursoUnassignedDatabase[] } {
  const organizations = listTursoOrganizationKeys().map((keys) => ({
    organizationEnv: keys.organizationEnv,
    organization: readEnv(keys.organizationEnv)?.trim() ?? "",
  }));
  const databasesByOrganization = new Map<string, TursoAccountFacts["databases"][number][]>();
  const unassigned: TursoUnassignedDatabase[] = [];

  for (const [label, tables] of Object.entries(inventory.tablesByDatabase)) {
    const credentialKeys = inventory.credentialKeysByDatabase[label] ?? [];
    const urlEnv = credentialKeys.find((key) => key.endsWith("_URL")) ?? credentialKeys[0] ?? label;
    const host = hostLabel(readEnv(urlEnv)?.trim());
    const owner = organizations.find(
      ({ organization }) => organization && host?.endsWith(`-${organization}`),
    );
    if (!owner || !host) {
      unassigned.push({ label, urlEnv });
      continue;
    }
    const list = databasesByOrganization.get(owner.organization) ?? [];
    list.push({
      label,
      cloudName: host.slice(0, -`-${owner.organization}`.length),
      tables,
      readers: readersOf(credentialKeys),
    });
    databasesByOrganization.set(owner.organization, list);
  }

  const accounts = organizations.map(({ organization, organizationEnv }) => {
    const databases = databasesByOrganization.get(organization) ?? [];
    return {
      organization: organization || organizationEnv,
      organizationEnv,
      databases,
      readers: [...new Set(databases.flatMap((database) => database.readers))],
      usage: snapshotFor(organization),
    };
  });
  return { accounts, unassigned };
}
