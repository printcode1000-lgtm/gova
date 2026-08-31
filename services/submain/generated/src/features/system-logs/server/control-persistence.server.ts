import 'server-only';
import {
  configureSystemLogsCore,
  DEFAULT_ALERT_THRESHOLD,
  DEFAULT_ALERT_WINDOW_MS,
  DEFAULT_RETENTION_DAYS,
} from '@asol/system-logs-core/server';
import { controlSystemLogsDataSource } from '@asol/data-core/control-system-logs';
import { isSuperAdminIdentity } from '@asol/auth-core/super-admin';
import {
  getSystemLogsAlertThreshold,
  getSystemLogsAlertWebhookUrl,
  getSystemLogsAlertWindowMs,
  getSystemLogsRetentionDays,
} from '@/core/config/control-env';

let configured = false;

/** Control-only System Logs adapter; deliberately excludes client/native ports. */
export function registerControlSystemLogPersistence(): void {
  if (configured) return;
  configured = true;
  configureSystemLogsCore({
    database: { execute: (sql, params = []) => controlSystemLogsDataSource.execute(sql, params) },
    identity: { isSuperAdmin: isSuperAdminIdentity },
    environment: {
      retentionDays: () => getSystemLogsRetentionDays(DEFAULT_RETENTION_DAYS),
      alertThreshold: () => getSystemLogsAlertThreshold(DEFAULT_ALERT_THRESHOLD),
      alertWindowMs: () => getSystemLogsAlertWindowMs(DEFAULT_ALERT_WINDOW_MS),
      alertWebhookUrl: () => getSystemLogsAlertWebhookUrl(),
    },
    monitor: { getCurrentFlowId: () => null, getSessionId: () => null },
    nativeCrash: { onCrash: () => () => undefined },
    clientSubmit: { submit: async () => undefined },
  });
}
