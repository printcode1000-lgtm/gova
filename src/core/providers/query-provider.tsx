'use client';

import * as React from 'react';
import {
  AsolQueryProvider,
  type QueryClient,
  type QueryPersistenceOperation,
} from '@asol/data-core/browser';
import { attachQueryObserver, registerMonitorTelemetry } from '@asol/observability-core';
import { reportPreAuthFailure } from '@/features/system-logs';

registerMonitorTelemetry();

function observeQueryClient(client: QueryClient): () => void {
  return attachQueryObserver(client);
}

function reportQueryPersistenceFailure(
  operation: QueryPersistenceOperation,
  error: unknown,
): void {
  reportPreAuthFailure(`${operation}-query-cache`, error);
}

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <AsolQueryProvider
      observeQueryClient={observeQueryClient}
      onPersistenceError={reportQueryPersistenceFailure}
    >
      {children}
    </AsolQueryProvider>
  );
}
