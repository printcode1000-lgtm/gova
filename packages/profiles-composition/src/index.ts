import { PROFILES_DECLARATION } from '@asol/account-declarations/profiles';
import * as serverEnv from '@/core/config/server-env';
import { profileService } from '@/features/profile/services/profile-service.bootstrap.server';

export interface ProfilesRuntimeConfig {
  /** Overrides the environment. Used by tests; production reads the declaration's keys. */
  env?: NodeJS.ProcessEnv;
}

export interface ProfilesRuntime {
  accountName: string;
  /**
   * The five profile reads this account serves, and nothing else.
   *
   * `/api/profile/reviews` is deliberately absent: it reads the product database as well
   * as the profile shards, and this account holds no product credentials. Exposing only
   * what the account can serve puts that boundary in the type rather than in a comment.
   */
  profiles: typeof profileService;
  serverEnv: typeof serverEnv;
}

/**
 * Rule 4 — the composition validates its own inputs, against the account declaration
 * rather than against names typed here.
 *
 * Hand-written variable names drift from the declaration silently, and the drift only
 * appears as a runtime failure on the deployed account. Reading `requiredEnv` means this
 * check cannot disagree with what the deploy actually pushes.
 */
export function assertProfilesEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = PROFILES_DECLARATION.requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[profiles-composition] ${PROFILES_DECLARATION.project} is missing required environment ` +
        `values: ${missing.join(', ')}`,
    );
  }
}

/**
 * Layer 2 for the profiles account.
 *
 * Validation is not performed here: this runs during `next build` as well as per request,
 * and build time has no account credentials. Routes call `assertProfilesEnv()` when a
 * request arrives, which is the only moment the credentials are supposed to exist.
 */
export function createProfilesRuntime(_config?: ProfilesRuntimeConfig): ProfilesRuntime {
  return {
    accountName: PROFILES_DECLARATION.project,
    profiles: profileService,
    serverEnv,
  };
}
