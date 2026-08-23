/**
 * Scenario / target enum values shared by the command catalog and the deploy
 * runbook UI. Kept here so adding a CLI value without the page (or the reverse)
 * is a single edit, not two catalogs that can drift.
 */
export const DEPLOY_ALL_SCENARIO_VALUES = [
  "full",
  "preflight",
  "publish",
  "services",
  "main",
  "from-notifications",
  "from-products",
  "from-orders",
  "from-profiles",
  "from-submain",
  "from-sub2main",
] as const;

export type DeployAllScenarioValue = (typeof DEPLOY_ALL_SCENARIO_VALUES)[number];

export const DEPLOY_PUSH_TARGET_VALUES = [
  "none",
  "main",
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
  "all",
] as const;

export type DeployPushTargetValue = (typeof DEPLOY_PUSH_TARGET_VALUES)[number];
