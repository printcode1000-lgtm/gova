import "server-only";

import type { SimulationActorKey } from "@asol/simulation-core";

const ENV_PREFIX: Partial<Record<SimulationActorKey, string>> = {
  "buyer-01": "SIM_BUYER_01",
  "buyer-02": "SIM_BUYER_02",
  "buyer-03": "SIM_BUYER_03",
  "seller-01": "SIM_SELLER_01",
  "seller-02": "SIM_SELLER_02",
  "seller-03": "SIM_SELLER_03",
  "provider-01": "SIM_PROVIDER_01",
  "provider-02": "SIM_PROVIDER_02",
  "provider-03": "SIM_PROVIDER_03",
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`simulationCredentialMissing:${name}`);
  return value;
}

export function isSimulationRuntimeAvailable(): boolean {
  return process.env.ASOL_SIMULATION_RUNTIME === "1";
}

export function getSimulationProxySecret(): string {
  return process.env.ASOL_SIMULATION_PROXY_SECRET?.trim() ?? "";
}

export function getSimulationActorCredentials(actorKey: SimulationActorKey) {
  const prefix = ENV_PREFIX[actorKey];
  if (!prefix) throw new Error("simulationActorCredentialMappingMissing");
  return {
    uid: required(`${prefix}_UID`),
    phone: required(`${prefix}_PHONE`),
    password: required(`${prefix}_PASSWORD`),
  };
}
