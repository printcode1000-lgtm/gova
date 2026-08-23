import "server-only";

import { isSuperAdminIdentity } from "@/features/auth";
import { featureFlagRepository } from "@asol/data-core/feature-flags";
import { FEATURE_FLAGS } from "../definitions";
import type { RemoteFeatureFlagValues } from "../types";

export interface FeatureFlagIdentity {
  uid: string;
  phone: string;
}

/**
 * Single responsibility: resolve the live flag state clients should apply.
 *
 * Every known flag is answered, not only the rows that exist. A flag with no
 * row yet reports its declared default, so adding a definition never depends on
 * someone remembering to seed the table, and a client can never be left with a
 * missing key it has to guess about.
 */
export const featureFlagService = {
  async getPublicValues(): Promise<RemoteFeatureFlagValues> {
    const stored = new Map(
      (await featureFlagRepository.list()).map((row) => [row.key, row.enabled]),
    );
    return Object.fromEntries(
      FEATURE_FLAGS.map((definition) => [
        definition.key,
        stored.get(definition.key) ?? definition.defaultEnabled ?? false,
      ]),
    );
  },

  async listForAdmin(identity: FeatureFlagIdentity) {
    assertSuperAdmin(identity);
    const stored = new Map(
      (await featureFlagRepository.list()).map((row) => [row.key, row]),
    );
    return FEATURE_FLAGS.map((definition) => {
      const row = stored.get(definition.key);
      return {
        key: definition.key,
        description: definition.description,
        capability: definition.capability,
        defaultEnabled: definition.defaultEnabled ?? false,
        enabled: row?.enabled ?? definition.defaultEnabled ?? false,
        notes: row?.notes ?? "",
        updatedAt: row?.updatedAt,
        updatedByUid: row?.updatedByUid,
        /** True while the flag has no row and is running on its default. */
        usingDefault: !row,
      };
    });
  },

  async setFlag(input: {
    identity: FeatureFlagIdentity;
    key: string;
    enabled: boolean;
    notes?: string;
  }) {
    assertSuperAdmin(input.identity);
    if (!FEATURE_FLAGS.some((definition) => definition.key === input.key)) {
      // An unknown key would be stored and never read, which looks like the
      // switch worked while nothing changed.
      throw new Error("featureFlagUnknown");
    }
    return featureFlagRepository.set({
      key: input.key,
      enabled: input.enabled,
      notes: input.notes,
      actorUid: input.identity.uid,
    });
  },
};

function assertSuperAdmin(identity: FeatureFlagIdentity): void {
  if (!isSuperAdminIdentity(identity.uid, identity.phone)) {
    throw new Error("forbidden");
  }
}
