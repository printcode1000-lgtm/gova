'use client';

import type { SimulationActor, SimulationActorKey } from '@asol/simulation-core';
import { asolApi } from '@/core/api';
import type { UserSession } from '@/features/auth';

export interface SimulationActorView extends SimulationActor {
  resumePath: string;
}

export interface SimulationStateView {
  enabled: boolean;
  runtimeAvailable: boolean;
  normalRoute: string;
  actorKey: SimulationActorKey | null;
  backendPort: number;
  actors: SimulationActorView[];
}

const STATE_ROUTE = '/api/dev/simulation/state';
const SESSION_ROUTE = '/api/dev/simulation/session';
const CHECKPOINT_ROUTE = '/api/dev/simulation/checkpoint';

export function getSimulationState(): Promise<SimulationStateView> {
  return asolApi.get<SimulationStateView>(STATE_ROUTE, {
    cache: 'no-store',
    localReadPolicy: 'networkAuthoritative',
    suppressErrorLog: true,
  });
}
export function setSimulationMode(
  enabled: boolean,
  sessionToken: string,
  normalRoute?: string,
): Promise<SimulationStateView> {
  return asolApi.post<SimulationStateView>(STATE_ROUTE, { enabled, ...(normalRoute ? { normalRoute } : {}) }, {
    headers: { 'x-asol-session-token': sessionToken },
    suppressErrorLog: true,
  });
}

export function createSimulationSession(): Promise<{
  actorKey: SimulationActorKey;
  session: UserSession;
}> {
  return asolApi.post(SESSION_ROUTE, {}, { suppressErrorLog: true });
}

export function checkpointSimulationPath(
  route: string,
  sessionToken: string,
): Promise<{ actorKey: SimulationActorKey; route: string }> {
  return asolApi.post(CHECKPOINT_ROUTE, { route }, {
    headers: { 'x-asol-session-token': sessionToken },
    suppressErrorLog: true,
  });
}
