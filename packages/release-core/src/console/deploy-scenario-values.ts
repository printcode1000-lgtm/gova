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

/**
 * There is deliberately no deploy:push target vocabulary.
 *
 * `deploy:push:fast` is pinned to `--fast --vercel-target=all` and refuses any
 * partial selection, so a target enum here would describe choices no run can
 * accept. Deploy one account on its own with its own `*:deploy` script.
 */
