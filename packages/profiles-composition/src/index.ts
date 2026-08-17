import { PROFILES_DECLARATION } from '@asol/account-declarations/profiles';
import * as serverEnv from '@/core/config/server-env';
import { profileService } from '@/features/profile/services/profile-service.bootstrap.server';

export interface ProfilesRuntimeConfig {
  /** Overrides the environment. Used by tests; production reads the declaration's keys. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Profile reads across the seven profile shards.
 *
 * `/api/profile/reviews` is deliberately absent: it reads the product database as well as
 * the profile shards, and this account holds no product credentials.
 */
export interface ProfilesDatabaseTask {
  profiles: typeof profileService;
}

/**
 * Image handling for this account is **key-to-URL string work only**.
 *
 * `asol-profiles` holds `R2_*` but no `R2_API_TOKEN`: it can turn a stored key into a
 * public URL, and it cannot create buckets, change CORS, or upload. Uploads stay on the
 * main app. Naming the task here records that it is narrow on purpose rather than
 * incomplete.
 */
export interface ProfilesImageTask {
  readonly writeAccess: false;
}

export interface ProfilesConfigTask {
  serverEnv: typeof serverEnv;
}

/**
 * The profiles account runtime, divided by task.
 *
 * An absent key is a capability the account cannot reach: there is no `crypto` task
 * because this account signs nothing.
 */
export interface ProfilesRuntime {
  accountName: string;
  database: ProfilesDatabaseTask;
  images: ProfilesImageTask;
  config: ProfilesConfigTask;
}

/** Rule 4 — validated against the declaration, never against names typed here. */
export function assertProfilesEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = PROFILES_DECLARATION.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[profiles-composition] ${PROFILES_DECLARATION.project} is missing required environment ` +
        `values: ${missing.join(', ')}`,
    );
  }
}

/** Layer 2 for the profiles account — the connector between its tasks. */
export function createProfilesRuntime(_config?: ProfilesRuntimeConfig): ProfilesRuntime {
  return {
    accountName: PROFILES_DECLARATION.project,
    database: { profiles: profileService },
    images: { writeAccess: false },
    config: { serverEnv },
  };
}
