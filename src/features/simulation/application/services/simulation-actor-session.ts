import type { SimulationUser } from "@asol/simulation-core";

import { sessionService } from "@/features/auth/ui";
import { simulationApiService } from "./simulation-api-service";

type SimulationActor = "guest" | "any" | SimulationUser;

/**
 * Gives the real page iframe the selected actor identity without changing the
 * in-memory Super Admin identity, then restores the persisted admin session.
 */
export async function beginSimulationActorSession(
  actor: SimulationActor,
): Promise<() => Promise<void>> {
  if (actor === "any") return async () => undefined;

  const originalSession = await sessionService.getSession();
  if (actor === "guest") {
    await sessionService.clearSession();
  } else {
    const login = await simulationApiService.login(actor.phone, actor.password);
    await sessionService.saveSession(login);
  }

  return async () => {
    if (originalSession) {
      await sessionService.saveSession(originalSession);
    } else {
      await sessionService.clearSession();
    }
  };
}
