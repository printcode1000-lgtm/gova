import type { SimulationUser } from "../domain/simulation.types";

export const SIMULATION_USERS: readonly SimulationUser[] = [
  { id: "buyer-1", role: "buyer", ordinal: 1, storeName: "مشتري 1", phone: "010000000001", password: "1111" },
  { id: "buyer-2", role: "buyer", ordinal: 2, storeName: "مشتري 2", phone: "010000000002", password: "2222" },
  { id: "buyer-3", role: "buyer", ordinal: 3, storeName: "مشتري 3", phone: "010000000003", password: "3333" },
  { id: "seller-1", role: "seller", ordinal: 1, storeName: "بائع 1", phone: "011000000001", password: "1111" },
  { id: "seller-2", role: "seller", ordinal: 2, storeName: "بائع 2", phone: "011000000002", password: "2222" },
  { id: "seller-3", role: "seller", ordinal: 3, storeName: "بائع 3", phone: "011000000003", password: "3333" },
  { id: "delivery-1", role: "delivery", ordinal: 1, storeName: "خدمة توصيل 1", phone: "012000000001", password: "1111" },
  { id: "delivery-2", role: "delivery", ordinal: 2, storeName: "خدمة توصيل 2", phone: "012000000002", password: "2222" },
  { id: "delivery-3", role: "delivery", ordinal: 3, storeName: "خدمة توصيل 3", phone: "012000000003", password: "3333" },
] as const;

export function simulationUserByRole(
  role: SimulationUser["role"],
  ordinal: 1 | 2 | 3 = 1,
): SimulationUser {
  const user = SIMULATION_USERS.find(
    (candidate) => candidate.role === role && candidate.ordinal === ordinal,
  );
  if (!user) throw new Error(`simulationUserNotFound:${role}:${ordinal}`);
  return user;
}
