export interface SimulationUserSpecialtySelection {
  main: {
    id: number;
    nameAr: string;
  };
  sub?: {
    id: number;
    nameAr: string;
  };
}

export interface SimulationUserBootstrapResult {
  id: string;
  uid?: string;
  status: "created" | "ready" | "failed";
  specialtySelection?: SimulationUserSpecialtySelection;
  error?: string;
}

export interface SimulationUsersBootstrapResponse {
  users: SimulationUserBootstrapResult[];
}
