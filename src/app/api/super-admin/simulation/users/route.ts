import "server-only";

import { ensureSimulationUsers } from "@/features/simulation/server";
import { runSuperAdminJsonRoute } from "@/features/super-admin/server";

type EmptySimulationUsersBody = Record<string, never>;

export const POST = (request: Request) =>
  runSuperAdminJsonRoute<EmptySimulationUsersBody, unknown>(
    "POST /api/super-admin/simulation/users",
    request,
    () => ensureSimulationUsers(),
  );
