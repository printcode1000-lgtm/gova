import {
  credentialKeysFor,
  DESIRED_SCHEMAS,
  LOGICAL_DATABASE_LABELS,
} from "@asol/data-core/provisioning";
import type { TursoDatabaseInventory } from "@/features/super-admin/server";

/**
 * The logical-database inventory `/dev/cloud-accounts` describes Turso with.
 *
 * Read here, in the development-only route, because the desired-schema manifests
 * are build-time provisioning metadata that runtime layers may not import. It
 * carries names only: each database's tables from its manifest and the
 * credential key names schema sync resolves for it.
 */
export function readTursoDatabaseInventory(): TursoDatabaseInventory {
  return {
    tablesByDatabase: Object.fromEntries(
      LOGICAL_DATABASE_LABELS.map((label) => [label, Object.keys(DESIRED_SCHEMAS[label].tables)]),
    ),
    credentialKeysByDatabase: Object.fromEntries(
      LOGICAL_DATABASE_LABELS.map((label) => [label, credentialKeysFor(label).split(" / ")]),
    ),
  };
}
