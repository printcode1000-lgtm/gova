import {
  assertSessionMatchesUid,
  extractSessionToken,
} from "@asol/auth-core/server";
import { checkpointSimulationRoute } from "@asol/simulation-core/server";
import {
  apiSuccess,
  mapServiceError,
  readJsonBody,
} from "@/core/api/api-response";
import { assertDevelopmentToolingAllowed } from "@/core/config/development-guard.server";
import { SUPER_ADMIN_UID } from "@/features/auth";
import "@/features/auth/server";
import { simulationActorFromRequest } from "@/features/dev-tools/server";
import { assertSuperAdminRequest } from "@/features/super-admin/server";

export async function POST(request: Request) {
  try {
    assertDevelopmentToolingAllowed("simulationDevelopmentOnly", {
      strict: true,
    });
    const actor = simulationActorFromRequest(request);
    if (actor.role === "super-admin") {
      assertSuperAdminRequest(request);
    } else if (actor.expectedUid) {
      assertSessionMatchesUid(extractSessionToken(request), actor.expectedUid);
    } else {
      throw new Error("simulationActorUidMissing");
    }
    const body = await readJsonBody<{ route?: unknown }>(request);
    if (typeof body.route !== "string")
      throw new Error("simulationRouteInvalid");
    const state = checkpointSimulationRoute(actor.key, body.route);
    return apiSuccess({ actorKey: actor.key, route: state.routes[actor.key] });
  } catch (error) {
    return mapServiceError(error);
  }
}
