import { readSimulationRuntimeState } from "@asol/simulation-core/server";
import { apiError, apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertDevelopmentToolingAllowed } from "@/core/config/development-guard.server";
import {
  createSimulationActorSession,
  simulationActorFromRequest,
} from "@/features/dev-tools/server";

export async function POST(request: Request) {
  try {
    assertDevelopmentToolingAllowed("simulationDevelopmentOnly", {
      strict: true,
    });
    if (!readSimulationRuntimeState().enabled) {
      return apiError("simulationDisabled", 409, { skipPersistence: true });
    }
    const actor = simulationActorFromRequest(request);
    const session = await createSimulationActorSession(actor);
    return apiSuccess({ actorKey: actor.key, session });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "simulationGatewayUnauthorized"
    ) {
      return apiError("forbidden", 403, { skipPersistence: true });
    }
    return mapServiceError(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
