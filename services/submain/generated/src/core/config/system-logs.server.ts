import 'server-only';

import {
  configureSystemLogsCore,
  DEFAULT_ALERT_THRESHOLD,
  DEFAULT_ALERT_WINDOW_MS,
  DEFAULT_RETENTION_DAYS,
} from '@asol/system-logs-core/server';
import { profilesDataSource } from '@asol/data-core/composition';
import { isSuperAdminIdentity } from '@/features/auth';

function retentionDays() {
  return Number(process.env.SYSTEM_LOGS_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
}

function alertThreshold() {
  return Number(process.env.SYSTEM_LOGS_ALERT_THRESHOLD ?? DEFAULT_ALERT_THRESHOLD);
}

function alertWindowMs() {
  return Number(process.env.SYSTEM_LOGS_ALERT_WINDOW_MS ?? DEFAULT_ALERT_WINDOW_MS);
}

function alertWebhookUrl() {
  return process.env.SYSTEM_LOGS_ALERT_WEBHOOK_URL ?? null;
}

let configured = false;

export function registerSystemLogsCoreServerPorts(): void {
  if (configured) return;
  configured = true;

  configureSystemLogsCore({
    database: {
      execute: (sql, params = []) => profilesDataSource.execute(sql, params),
    },
    identity: {
      isSuperAdmin: isSuperAdminIdentity,
    },
    environment: {
      retentionDays,
      alertThreshold,
      alertWindowMs,
      alertWebhookUrl,
    },
    monitor: {
      getCurrentFlowId: () => null,
      getSessionId: () => null,
    },
    nativeCrash: {
      onCrash: () => () => undefined,
    },
    clientSubmit: {
      submit: async () => undefined,
    },
  });
}
