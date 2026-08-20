import 'server-only';

/**
 * The composition root for every server-side port a sealed package names.
 *
 * Called once from `src/instrumentation.ts`, before the first request. The individual seams stay
 * separately importable on purpose: a route that needs one must not drag the others into its
 * module graph, because the service mirrors are built by walking exactly that graph and an
 * account may not reach a capability it holds no credential for. This root is what runs them all
 * where the whole application is present — it is not a barrel for routes to import.
 *
 * Every port defaults safely, so a missed registration costs trace lines or admin visibility,
 * never a query and never an update. `tests/ports-registry.test.ts` still asserts that each seam
 * is listed here, because a safe default is exactly what hides a forgotten one.
 */
export async function registerAppServerPorts(): Promise<void> {
  const { ensureStorageProfilesValidated } = await import('@asol/storage-core/server');
  ensureStorageProfilesValidated();

  const { configureObservabilityCore } = await import('@asol/observability-core');
  const { isDevelopment } = await import('@/core/config');
  configureObservabilityCore({ isDevelopment: () => isDevelopment });

  // `@asol/data-core` announces its queries through a port whose defaults are silent, so the
  // developer monitor only sees them once these two seams register.
  const { registerMonitorTelemetry } = await import('@asol/observability-core');
  registerMonitorTelemetry();
  const { registerServerMonitorTelemetry } = await import(
    '@asol/observability-core/server'
  );
  registerServerMonitorTelemetry();

  // `@asol/orders-core` decides what an order means and never who is an administrator. Its
  // identity port fails closed, so this registration is what lets the real super admin act as
  // one — not what protects the routes from everyone else.
  const { registerOrdersCorePorts } = await import('@/features/orders/orders-core-ports');
  registerOrdersCorePorts();

  const { registerSystemLogsCoreServerPorts } = await import('@/core/config/system-logs.server');
  registerSystemLogsCoreServerPorts();

  const { registerOtaCoreServerPorts } = await import('@/features/ota/server');
  registerOtaCoreServerPorts();
}
