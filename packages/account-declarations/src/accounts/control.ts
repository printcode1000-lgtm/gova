/**
 * Operational-only control runtime. Values are deliberately names-only.
 *
 * What control's route graph proves it needs to answer at all: the session
 * secret every operational route verifies against, the primary Turso database
 * behind OTA administration, and the system-ops shard behind System Logs.
 * Without any one of them control still starts and then refuses every request,
 * which is the failure this list exists to make impossible.
 */
export const CONTROL_RUNTIME_REQUIRED_ENV_KEYS = [
  'ASOL_SESSION_SIGNING_SECRET',
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'SYSTEM_OPS_DATABASE_URL',
  'SYSTEM_OPS_DATABASE_AUTH_TOKEN',
] as const;

/**
 * The release plane. Optional because control serves Super Admin, System Logs,
 * and OTA administration without it — it degrades to `productionDeployNotConfigured`
 * rather than failing to start.
 *
 * `ASOL_REMOTE_DEPLOY_SANDBOX` was listed as required here and is not a control
 * value at all: the sandbox runner sets it to `1` inside its own child process.
 * The live preflight caught it as a key nothing on this runtime ever reads.
 */
export const CONTROL_RUNTIME_OPTIONAL_ENV_KEYS = [
  'ASOL_DEPLOY_REPOSITORY_URL',
  'ASOL_DEPLOY_REPOSITORY_TOKEN',
  'ASOL_DEPLOY_CALLBACK_SECRET',
  'ASOL_DEPLOY_CALLBACK_BASE_URL',
  'ASOL_DEPLOY_NOTIFICATION_EMAIL',
  'ASOL_SECRET_ARCHIVE_PASSWORD',
  'ASOL_NOTIFICATION_GRANT_SECRET',
  'ASOL_NOTIFICATIONS_URL',
  'PASSWORD_RECOVERY_GMAIL_USER',
  'PASSWORD_RECOVERY_GMAIL_APP_PASSWORD',
  'SYSTEM_LOGS_RETENTION_DAYS',
  'SYSTEM_LOGS_ALERT_THRESHOLD',
  'SYSTEM_LOGS_ALERT_WINDOW_MS',
  'SYSTEM_LOGS_ALERT_WEBHOOK_URL',
] as const;

export const CONTROL_DECLARATION = {
  name: 'control',
  project: 'asol-control',
  // Verified live against VERCEL_CONTROL_TOKEN during the cutover preflight.
  // It had been recorded as the gova owner, which would have sent whoever
  // needed a new token to the wrong inbox at the moment control was down.
  email: 'tenderxcontractors@gmail.com',
  tokenEnvVar: 'VERCEL_CONTROL_TOKEN',
  serviceDir: 'services/control',
  requiredEnv: CONTROL_RUNTIME_REQUIRED_ENV_KEYS,
  optionalEnv: CONTROL_RUNTIME_OPTIONAL_ENV_KEYS,
  mirrorEntryPoints: [
    'features/release-commands/server/services/production-deploy-service.server.ts',
    'core/config/control-env.ts',
  ],
  runtimeAssets: [],
} as const;
