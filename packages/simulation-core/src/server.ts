import { timingSafeEqual } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SIMULATION_ACTORS, type SimulationActorKey } from "./index";

export function simulationGatewaySecretMatches(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export interface SimulationRuntimeState {
  enabled: boolean;
  routes: Partial<Record<SimulationActorKey, string>>;
  normalRoute: string;
  updatedAt: string;
}

const STATE_FILE = join(tmpdir(), "gova-live-simulation-state.json");

function defaultState(): SimulationRuntimeState {
  return {
    enabled: false,
    routes: {},
    normalRoute: "/home",
    updatedAt: new Date().toISOString(),
  };
}

function normalizeRoute(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 1 || value.length > 2_048)
    return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/api/dev/simulation")) return null;
  if (value.startsWith("/login") || value.startsWith("/register")) return null;
  return value;
}
export function readSimulationRuntimeState(): SimulationRuntimeState {
  try {
    const parsed = JSON.parse(
      readFileSync(STATE_FILE, "utf8"),
    ) as Partial<SimulationRuntimeState>;
    const validKeys = new Set(SIMULATION_ACTORS.map((actor) => actor.key));
    const routes: Partial<Record<SimulationActorKey, string>> = {};
    for (const [key, route] of Object.entries(parsed.routes ?? {})) {
      const normalized = normalizeRoute(route);
      if (validKeys.has(key as SimulationActorKey) && normalized) {
        routes[key as SimulationActorKey] = normalized;
      }
    }
    return {
      enabled: parsed.enabled === true,
      routes,
      normalRoute: normalizeRoute(parsed.normalRoute) ?? "/home",
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return defaultState();
  }
}

export function writeSimulationRuntimeState(
  state: SimulationRuntimeState,
): void {
  const next = { ...state, updatedAt: new Date().toISOString() };
  const temporary = `${STATE_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(next, null, 2), { mode: 0o600 });
  renameSync(temporary, STATE_FILE);
}
export function resetSimulationRuntimeState(): SimulationRuntimeState {
  const state = defaultState();
  writeSimulationRuntimeState(state);
  return state;
}

export function setSimulationEnabled(
  enabled: boolean,
  normalRoute?: string,
): SimulationRuntimeState {
  const current = readSimulationRuntimeState();
  const normalizedNormalRoute =
    normalRoute === undefined ? null : normalizeRoute(normalRoute);
  if (normalRoute !== undefined && !normalizedNormalRoute)
    throw new Error("simulationRouteInvalid");
  const next = {
    ...current,
    enabled,
    normalRoute: normalizedNormalRoute ?? current.normalRoute,
  };
  writeSimulationRuntimeState(next);
  return next;
}

export function checkpointSimulationRoute(
  actorKey: SimulationActorKey,
  route: string,
): SimulationRuntimeState {
  const normalized = normalizeRoute(route);
  if (!normalized) throw new Error("simulationRouteInvalid");
  const current = readSimulationRuntimeState();
  const next: SimulationRuntimeState = {
    ...current,
    routes: { ...current.routes, [actorKey]: normalized },
  };
  writeSimulationRuntimeState(next);
  return next;
}

export function simulationStateFilePath(): string {
  return STATE_FILE;
}
