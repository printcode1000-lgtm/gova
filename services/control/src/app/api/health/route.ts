import { credentialHealthResponse } from '@asol/service-runtime-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness only — presence, never values. This endpoint is public.
 *
 * Each entry is a capability control can lose independently. The session secret
 * is what every operational route verifies against, so without it control still
 * answers but authorizes nothing; the deployment credentials are what the
 * release plane needs to act on the other accounts. Reporting them separately is
 * what makes "control is up but cannot deploy" a visible state rather than a
 * confusing one.
 */
export function GET(): Response {
  return credentialHealthResponse({
    service: 'asol-control',
    credentials: {
      sessionSigningSecret: process.env.ASOL_SESSION_SIGNING_SECRET,
      systemLogsDatabase: process.env.PROFILE_CORE_DATABASE_URL ?? process.env.TURSO_DATABASE_URL,
      otaDatabase: process.env.TURSO_DATABASE_URL,
      deployRepository: process.env.ASOL_DEPLOY_REPOSITORY_URL,
      deploySandbox: process.env.ASOL_REMOTE_DEPLOY_SANDBOX,
    },
  });
}
