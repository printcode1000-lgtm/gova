export const DEPLOY_ALL_PHASE_ORDER = [
  "preflight",
  "publish",
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
  "main",
] as const;

export type DeployAllPhaseId = (typeof DEPLOY_ALL_PHASE_ORDER)[number];

export const SERVICE_PHASE_IDS = [
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
] as const;

export type DeployAllServicePhaseId = (typeof SERVICE_PHASE_IDS)[number];

export function isDeployAllPhaseId(value: string): value is DeployAllPhaseId {
  return (DEPLOY_ALL_PHASE_ORDER as readonly string[]).includes(value);
}

export function phasesFrom(phaseId: DeployAllPhaseId): DeployAllPhaseId[] {
  const index = DEPLOY_ALL_PHASE_ORDER.indexOf(phaseId);
  if (index < 0) return [];
  return DEPLOY_ALL_PHASE_ORDER.slice(index);
}

export function phasePrerequisites(phaseId: DeployAllPhaseId): DeployAllPhaseId[] {
  const index = DEPLOY_ALL_PHASE_ORDER.indexOf(phaseId);
  if (index <= 0) return [];
  return DEPLOY_ALL_PHASE_ORDER.slice(0, index);
}

export function formatPhaseList(): string {
  return DEPLOY_ALL_PHASE_ORDER.map((id, index) => `  ${index + 1}. ${id}`).join("\n");
}
