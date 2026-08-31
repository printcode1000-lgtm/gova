import 'server-only';

/** Control-runtime configuration door; never imports the gova-wide env barrel. */
export {
  getProductionDeployCallbackBaseUrl,
  getProductionDeployCallbackSecret,
  getProductionDeployMailConfig,
} from './server-env/server-env.values.production-deploy';

/** System Logs retention/alerting configuration for the control runtime. */
export {
  getSystemLogsAlertThreshold,
  getSystemLogsAlertWebhookUrl,
  getSystemLogsAlertWindowMs,
  getSystemLogsRetentionDays,
} from './server-env/server-env.values.system-logs';

/** Operational endpoint used only by the unattended release callback. */
export { getControlNotificationsUrl } from './server-env/server-env.values.control-operations';
