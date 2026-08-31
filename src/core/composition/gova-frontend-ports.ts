import 'server-only';

/**
 * The composition root for the gova frontend deployment.
 *
 * gova serves pages, static assets, `/.well-known/**`, `/api/health`, and the
 * stateless compatibility redirect boundary. It implements no Business API, so
 * it registers no business port: no data, storage, orders, system logs, OTA
 * admin, notifications, or release capability. Registering them would put those
 * packages — and the credentials they ask for — into the gova server trace even
 * though nothing in the deployment can call them.
 *
 * Observability is registered because it is not a business capability: it is how
 * a failure in a rendered page becomes visible at all.
 */
export async function registerGovaFrontendServerPorts(): Promise<void> {
  const { configureObservabilityCore, registerMonitorTelemetry } = await import(
    '@asol/observability-core'
  );
  const { isDevelopment } = await import('@/core/config');
  configureObservabilityCore({ isDevelopment: () => isDevelopment });
  registerMonitorTelemetry();

  const { registerServerMonitorTelemetry } = await import('@asol/observability-core/server');
  registerServerMonitorTelemetry();
}
