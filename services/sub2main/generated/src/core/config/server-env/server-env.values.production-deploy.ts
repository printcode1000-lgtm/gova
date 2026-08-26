import { readEnv } from "@asol/env-core";

/**
 * Server configuration for the super-admin production deploy.
 *
 * The archive password and the Vercel Sandbox credentials are deliberately
 * absent: only `@asol/vercel-deploy-core` reads those, and it hands them
 * straight to the sandbox command. What the application itself needs is the
 * callback secret, the callback origin, and where to email the result.
 */

export interface ProductionDeployMailConfig {
  gmailUser: string;
  gmailAppPassword: string;
  recipient: string;
}

export function getProductionDeployMailConfig(): ProductionDeployMailConfig | null {
  const gmailUser = readEnv("PASSWORD_RECOVERY_GMAIL_USER");
  const gmailAppPassword = readEnv("PASSWORD_RECOVERY_GMAIL_APP_PASSWORD").replace(/\s+/g, "");
  const recipient = readEnv("ASOL_DEPLOY_NOTIFICATION_EMAIL");
  if (!gmailUser || !gmailAppPassword || !recipient) return null;
  return { gmailUser, gmailAppPassword, recipient };
}

export function getProductionDeployCallbackSecret(): string {
  return readEnv("ASOL_DEPLOY_CALLBACK_SECRET");
}

/** Empty when the request's own origin should be used. */
export function getProductionDeployCallbackBaseUrl(): string {
  return readEnv("ASOL_DEPLOY_CALLBACK_BASE_URL") || readEnv("NEXT_PUBLIC_ASOL_API_BASE_URL");
}
