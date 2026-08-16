import { PROFILES_DECLARATION } from '@asol/vercel-deploy-core';
import * as serverEnv from '@/core/config/server-env';
import * as profileBootstrap from '@/features/profile/services/profile-service.bootstrap.server';

export interface ProfilesRuntimeConfig {
  databaseUrl?: string;
  databaseAuthToken?: string;
}

export interface ProfilesRuntime {
  accountName: string;
  bootstrap: typeof profileBootstrap;
  serverEnv: typeof serverEnv;
}

export function createProfilesRuntime(config?: ProfilesRuntimeConfig): ProfilesRuntime {
  const dbUrl = config?.databaseUrl ?? process.env.PROFILE_CORE_DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  if (!dbUrl && process.env.NODE_ENV === 'production') {
    throw new Error('[profiles-composition] Missing required database configuration for profiles account.');
  }

  return {
    accountName: PROFILES_DECLARATION.project,
    bootstrap: profileBootstrap,
    serverEnv,
  };
}
