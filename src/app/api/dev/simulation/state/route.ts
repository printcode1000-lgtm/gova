import {
  SIMULATION_ACTORS,
  SIMULATION_BACKEND_PORT,
  simulationActorByKey,
} from "@asol/simulation-core";
import {
  readSimulationRuntimeState,
  setSimulationEnabled,
} from "@asol/simulation-core/server";
import {
  apiSuccess,
  mapServiceError,
  readJsonBody,
} from "@/core/api/api-response";
import { assertDevelopmentToolingAllowed } from "@/core/config/development-guard.server";
import { isSimulationRuntimeAvailable } from "@/core/config/simulation.server";
import { assertSuperAdminRequest } from "@/features/super-admin/server";

function snapshot(request: Request) {
  const state = readSimulationRuntimeState();
  const actor = simulationActorByKey(
    request.headers.get("x-asol-simulation-actor"),
  );
  return {
    enabled: state.enabled,
    runtimeAvailable: isSimulationRuntimeAvailable(),
    normalRoute: state.normalRoute,
    actorKey: actor?.key ?? null,
    backendPort: SIMULATION_BACKEND_PORT,
    actors: SIMULATION_ACTORS.map((item) => ({
      key: item.key,
      port: item.port,
      role: item.role,
      labelAr: item.labelAr,
      expectedUid: item.expectedUid,
      defaultPath: item.defaultPath,
      resumePath: state.routes[item.key] ?? item.defaultPath,
    })),
  };
}

export async function GET(request: Request) {
  try {
    assertDevelopmentToolingAllowed("simulationDevelopmentOnly", {
      strict: true,
    });
    return apiSuccess(snapshot(request));
  } catch (error) {
    return mapServiceError(error);
  }
}
export async function POST(request: Request) {
  try {
    assertDevelopmentToolingAllowed("simulationDevelopmentOnly", {
      strict: true,
    });
    assertSuperAdminRequest(request);
    if (!isSimulationRuntimeAvailable())
      throw new Error("simulationRuntimeUnavailable");
    const body = await readJsonBody<{
      enabled?: unknown;
      normalRoute?: unknown;
    }>(request);
    if (typeof body.enabled !== "boolean")
      throw new Error("simulationEnabledInvalid");
    if (body.normalRoute !== undefined && typeof body.normalRoute !== "string")
      throw new Error("simulationRouteInvalid");
    setSimulationEnabled(body.enabled, body.normalRoute as string | undefined);
    return apiSuccess(snapshot(request));
  } catch (error) {
    return mapServiceError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
