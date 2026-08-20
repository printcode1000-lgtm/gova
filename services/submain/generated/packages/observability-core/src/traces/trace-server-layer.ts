import 'server-only';

import { isObservabilityEnabled } from '../ports';
import { pushDevTrace } from '../traces/server-trace';
import type { DevTraceLayer } from '../traces/dev-trace-types';

export async function traceServerLayer<T>(
  layer: DevTraceLayer,
  name: string,
  action: () => Promise<T>
): Promise<T> {
  if (!isObservabilityEnabled()) return action();

  const startedAt = Date.now();
  try {
    const result = await action();
    pushDevTrace({
      layer,
      name,
      executionTimeMs: Date.now() - startedAt,
      status: 'success',
    });
    return result;
  } catch (error) {
    pushDevTrace({
      layer,
      name,
      executionTimeMs: Date.now() - startedAt,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
