export type SimulationActorKey =
  | "buyer-01"
  | "buyer-02"
  | "buyer-03"
  | "seller-01"
  | "seller-02"
  | "seller-03"
  | "provider-01"
  | "provider-02"
  | "provider-03"
  | "super-admin";

export type SimulationActorRole =
  "buyer" | "seller" | "service-provider" | "super-admin";

export interface SimulationActor {
  key: SimulationActorKey;
  port: number;
  role: SimulationActorRole;
  labelAr: string;
  expectedUid: string | null;
  defaultPath: string;
}

export const SIMULATION_BACKEND_PORT = 3199;
export const SIMULATION_ACTOR_HEADER = "x-asol-simulation-actor";
export const SIMULATION_PROXY_SECRET_HEADER = "x-asol-simulation-proxy-secret";
export const SIMULATION_ACTORS: readonly SimulationActor[] = [
  {
    key: "buyer-01",
    port: 3002,
    role: "buyer",
    labelAr: "مشتري 01",
    expectedUid: "usr_sim_buyer_01",
    defaultPath: "/home",
  },
  {
    key: "buyer-02",
    port: 3003,
    role: "buyer",
    labelAr: "مشتري 02",
    expectedUid: "usr_sim_buyer_02",
    defaultPath: "/home",
  },
  {
    key: "buyer-03",
    port: 3004,
    role: "buyer",
    labelAr: "مشتري 03",
    expectedUid: "usr_sim_buyer_03",
    defaultPath: "/home",
  },
  {
    key: "seller-01",
    port: 3005,
    role: "seller",
    labelAr: "بائع 01",
    expectedUid: "usr_sim_seller_01",
    defaultPath: "/profile?mode=edit",
  },
  {
    key: "seller-02",
    port: 3006,
    role: "seller",
    labelAr: "بائع 02",
    expectedUid: "usr_sim_seller_02",
    defaultPath: "/profile?mode=edit",
  },
  {
    key: "seller-03",
    port: 3007,
    role: "seller",
    labelAr: "بائع 03",
    expectedUid: "usr_sim_seller_03",
    defaultPath: "/profile?mode=edit",
  },
  {
    key: "provider-01",
    port: 3008,
    role: "service-provider",
    labelAr: "مقدم خدمة 01",
    expectedUid: "usr_sim_provider_01",
    defaultPath: "/profile?mode=edit",
  },
  {
    key: "provider-02",
    port: 3009,
    role: "service-provider",
    labelAr: "مقدم خدمة 02",
    expectedUid: "usr_sim_provider_02",
    defaultPath: "/profile?mode=edit",
  },
  {
    key: "provider-03",
    port: 3010,
    role: "service-provider",
    labelAr: "مقدم خدمة 03",
    expectedUid: "usr_sim_provider_03",
    defaultPath: "/profile?mode=edit",
  },
  {
    key: "super-admin",
    port: 3011,
    role: "super-admin",
    labelAr: "سوبر أدمن",
    expectedUid: null,
    defaultPath: "/super-admin/users",
  },
] as const;

const ACTORS_BY_KEY = new Map(
  SIMULATION_ACTORS.map((actor) => [actor.key, actor]),
);
const ACTORS_BY_PORT = new Map(
  SIMULATION_ACTORS.map((actor) => [actor.port, actor]),
);

export function simulationActorByKey(
  key: string | null | undefined,
): SimulationActor | null {
  if (!key) return null;
  return ACTORS_BY_KEY.get(key as SimulationActorKey) ?? null;
}
export function simulationActorByPort(port: number): SimulationActor | null {
  return ACTORS_BY_PORT.get(port) ?? null;
}

export function simulationActorFromLocation(
  location: Pick<Location, "port">,
): SimulationActor | null {
  const port = Number(location.port);
  return Number.isInteger(port) ? simulationActorByPort(port) : null;
}

export function simulationActorUrl(
  actor: SimulationActor,
  path = actor.defaultPath,
  hostname = "127.0.0.1",
): string {
  const safePath = path.startsWith("/") ? path : actor.defaultPath;
  return `http://${hostname}:${actor.port}${safePath}`;
}

export function simulationBackendUrl(
  path = "/",
  hostname = "127.0.0.1",
): string {
  const safePath = path.startsWith("/") ? path : "/";
  return `http://${hostname}:${SIMULATION_BACKEND_PORT}${safePath}`;
}

export function isSimulationActorKey(
  value: string,
): value is SimulationActorKey {
  return ACTORS_BY_KEY.has(value as SimulationActorKey);
}
