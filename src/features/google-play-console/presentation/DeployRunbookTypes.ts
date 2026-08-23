import type { DeployAllRunbookBranch, DeployPushRunbookBranch } from "@asol/release-core/console";

export type DeployTab = "deploy-all" | "deploy-push";
export type DeployRunbookBranch = DeployAllRunbookBranch | DeployPushRunbookBranch;

export interface DeployRunbookPhaseView {
  id: string;
  label: string;
  sections: readonly {
    id: string;
    label: string;
    branches: readonly DeployRunbookBranch[];
  }[];
}
