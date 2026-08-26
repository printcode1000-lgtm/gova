import type { UiDescriptor } from "@asol/ui-registry-core";

/**
 * Registered identities for the runbook selection controls.
 *
 * They live beside the component rather than inside it because the presentation
 * file is held to a 200-line budget, and an identity map is data, not markup.
 */
export const SELECTION_UI = {
  "select-all": {
    uid: "deploy-runbook.controls.select-all-v4wrX5",
    id: "deploy-runbook.controls.select-all",
    kind: "action",
    action: "select-all",
    part: "selection",
  },
  "select-none": {
    uid: "deploy-runbook.controls.select-none-q9bRsA",
    id: "deploy-runbook.controls.select-none",
    kind: "action",
    action: "select-none",
    part: "selection",
  },
  "select-safe": {
    uid: "deploy-runbook.controls.select-safe-mSNY7v",
    id: "deploy-runbook.controls.select-safe",
    kind: "action",
    action: "select-safe",
    part: "selection",
  },
  "select-dangerous": {
    uid: "deploy-runbook.controls.select-dangerous-9fJZtW",
    id: "deploy-runbook.controls.select-dangerous",
    kind: "action",
    action: "select-dangerous",
    part: "selection",
  },
} as const satisfies Record<string, UiDescriptor>;
