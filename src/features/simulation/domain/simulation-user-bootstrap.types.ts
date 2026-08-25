export interface SimulationUserBootstrapResult {
  id: string;
  uid?: string;
  status: "created" | "ready" | "failed";
  error?: string;
}

export interface SimulationUsersBootstrapResponse {
  users: SimulationUserBootstrapResult[];
}
