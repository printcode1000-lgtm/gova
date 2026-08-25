import { ASOL_API_ROUTES, asolApi } from "@/core/api";
import type { SimulationUsersBootstrapResponse } from "../../domain/simulation-user-bootstrap.types";

interface SimulationLoginResult {
  uid: string;
  phone: string;
  email: string;
  specialties: {
    main: number[];
    sub: Record<string, number[]>;
  };
  sessionToken: string;
}

class SimulationApiService {
  login(phone: string, password: string): Promise<SimulationLoginResult> {
    return asolApi.post<SimulationLoginResult>(
      ASOL_API_ROUTES.auth.login,
      { phone, password },
      { suppressErrorLog: true },
    );
  }

  ensureUsers(sessionToken: string): Promise<SimulationUsersBootstrapResponse> {
    return asolApi.post<SimulationUsersBootstrapResponse>(
      "/api/super-admin/simulation/users",
      {},
      { headers: { "x-asol-session-token": sessionToken } },
    );
  }
}

export const simulationApiService = new SimulationApiService();
