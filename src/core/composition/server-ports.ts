import 'server-only';

/**
 * The composition root for every server-side port a sealed package names.
 *
 * Called once from `src/instrumentation.ts`, before the first request. The individual seams stay
 * separately importable on purpose: a route that needs one must not drag the others into its
 * module graph, because the service mirrors are built by walking exactly that graph and an
 * account may not reach a capability it holds no credential for. This root is what runs them all
 * where the whole application is present — it is not a barrel for routes to import.
 */
export async function registerAppServerPorts(): Promise<void> {
  const { ensureStorageProfilesValidated } = await import('@asol/storage-core/server');
  ensureStorageProfilesValidated();

  const { configureObservabilityCore } = await import('@asol/observability-core');
  const { isDevelopment } = await import('@/core/config');
  configureObservabilityCore({ isDevelopment: () => isDevelopment });

  const { registerMonitorTelemetry } = await import('@asol/observability-core');
  registerMonitorTelemetry();
  const { registerServerMonitorTelemetry } = await import(
    '@asol/observability-core/server'
  );
  registerServerMonitorTelemetry();

  const { registerOrdersCorePorts } = await import('@/features/orders');
  registerOrdersCorePorts();

  const { registerSystemLogsCoreServerPorts } = await import('@/core/config/system-logs.server');
  registerSystemLogsCoreServerPorts();

  const { registerOtaCoreServerPorts } = await import('@/features/ota/server');
  registerOtaCoreServerPorts();

  const {
    configureNotificationAdminAuthorization,
    registerNotificationsCorePorts,
  } = await import('@/features/notifications/server');
  const { isSuperAdminIdentity } = await import('@/features/auth');
  configureNotificationAdminAuthorization(({ uid, phone }) =>
    isSuperAdminIdentity(uid, phone),
  );
  registerNotificationsCorePorts();

  const { registerStorageCorePorts } = await import('@/features/storage/server');
  registerStorageCorePorts();

  const { registerDataCorePorts } = await import('@/features/data/server');
  registerDataCorePorts();

  const { registerServerApplicationPorts } = await import(
    './server-application-ports'
  );
  registerServerApplicationPorts();
}
