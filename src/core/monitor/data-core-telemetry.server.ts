import 'server-only';

/**
 * The server half of the telemetry seam. It is separate from `data-core-telemetry.ts` because
 * both modules it wires are `server-only`: importing them from the browser half would pull
 * `server-only` into the client bundle and fail the build.
 *
 * Registering twice is safe — `registerDataCoreTelemetry` merges over the safe defaults, so the
 * server ends up with the query and layer tracing on top of whatever the shared half installed.
 */
import { registerDataCoreTelemetry } from '@asol/data-core/telemetry';

import { createDrizzleDevLogger } from '@/core/monitor/drizzle-dev-logger';
import { traceServerLayer } from '@/core/monitor/trace-server-layer';
import type { DevTraceLayer } from '@/core/monitor/dev-trace-types';
import { isDevelopment } from '@/core/config';

export function registerServerMonitorTelemetry(): void {
  registerDataCoreTelemetry({
    traceServerLayer: (layer, name, action) =>
      traceServerLayer(layer as DevTraceLayer, name, action),
    createQueryLogger: () => (isDevelopment ? createDrizzleDevLogger() : undefined),
  });
}
