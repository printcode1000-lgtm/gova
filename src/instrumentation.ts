export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureStorageProfilesValidated } = await import(
      '@asol/storage-core/server'
    );
    ensureStorageProfilesValidated();

    // `@asol/data-core` announces its queries through a port whose defaults are silent, so the
    // developer monitor only sees them once these two seams register. Both run before the first
    // request, and a failure to register costs trace lines rather than queries.
    const { registerMonitorTelemetry } = await import('@/core/monitor/data-core-telemetry');
    registerMonitorTelemetry();
    const { registerServerMonitorTelemetry } = await import(
      '@/core/monitor/data-core-telemetry.server'
    );
    registerServerMonitorTelemetry();

    // `@asol/orders-core` decides what an order means and never who is an administrator. Its
    // identity port fails closed, so this registration is what lets the real super admin act as
    // one — not what protects the routes from everyone else.
    const { registerOrdersCorePorts } = await import('@/features/orders/orders-core-ports');
    registerOrdersCorePorts();
  }
}
