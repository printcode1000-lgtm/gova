import "server-only";

import { createSignedSessionToken } from "@asol/auth-core/server";
import { getUserByUidQuery } from "@asol/data-core/auth";
import { getProfileSpecialtiesQuery } from "@asol/data-core/profile";
import {
  SIMULATION_ACTOR_HEADER,
  SIMULATION_PROXY_SECRET_HEADER,
  simulationActorByKey,
  type SimulationActor,
} from "@asol/simulation-core";
import { simulationGatewaySecretMatches } from "@asol/simulation-core/server";
import { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID } from "@/features/auth";
import { authOperationsService } from "@/features/auth/server";
import {
  getSimulationActorCredentials,
  getSimulationProxySecret,
} from "@/core/config/simulation.server";

export function simulationActorFromRequest(request: Request): SimulationActor {
  if (
    !simulationGatewaySecretMatches(
      request.headers.get(SIMULATION_PROXY_SECRET_HEADER),
      getSimulationProxySecret(),
    )
  )
    throw new Error("simulationGatewayUnauthorized");
  const actor = simulationActorByKey(
    request.headers.get(SIMULATION_ACTOR_HEADER),
  );
  if (!actor) throw new Error("simulationActorMissing");
  return actor;
}

async function superAdminSession() {
  const user = await getUserByUidQuery.execute(SUPER_ADMIN_UID);
  if (!user) throw new Error("simulationSuperAdminMissing");
  const specialties = await getProfileSpecialtiesQuery.execute(SUPER_ADMIN_UID);
  return {
    uid: SUPER_ADMIN_UID,
    phone: SUPER_ADMIN_PHONE,
    email: user.email ?? "",
    providerAccountEnabled: user.providerAccountEnabled ?? false,
    specialties,
    sessionToken: createSignedSessionToken(SUPER_ADMIN_UID, SUPER_ADMIN_PHONE),
  };
}

export async function createSimulationActorSession(actor: SimulationActor) {
  if (actor.role === "super-admin") return superAdminSession();
  const { uid, phone, password } = getSimulationActorCredentials(actor.key);
  if (uid !== actor.expectedUid) throw new Error("simulationActorUidMismatch");
  const result = await authOperationsService.login({ phone, password });
  if (result.uid !== uid) throw new Error("simulationActorLoginMismatch");
  return result;
}
