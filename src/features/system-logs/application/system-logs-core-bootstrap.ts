'use client';

import { configureSystemLogsCore } from '@asol/system-logs-core';
import { getCurrentFlowId, getSessionId } from '@asol/observability-core';
import { persistentSystemLogApiService } from './services/persistent-system-log-api-service';

let configured = false;

export function registerSystemLogsCoreBrowserPorts(): void {
  if (configured) return;
  configured = true;

  configureSystemLogsCore({
    clientSubmit: {
      submit: async (input) => {
        await persistentSystemLogApiService.ingest(input);
      },
    },
    monitor: {
      getCurrentFlowId: () => getCurrentFlowId(),
      getSessionId: () => getSessionId(),
    },
    nativeCrash: {
      onCrash: (handler) => {
        if (typeof window === 'undefined') return () => undefined;
        const listener = (event: Event) => {
          const detail = (event as CustomEvent).detail;
          if (detail && typeof detail === 'object') {
            handler(detail as Record<string, unknown>);
          }
        };
        window.addEventListener('asol:native-crash', listener);
        return () => window.removeEventListener('asol:native-crash', listener);
      },
    },
    identity: {
      isSuperAdmin: () => false,
    },
    environment: {
      retentionDays: () => 90,
      alertThreshold: () => 10,
      alertWindowMs: () => 60 * 60 * 1_000,
      alertWebhookUrl: () => null,
    },
  });
}
