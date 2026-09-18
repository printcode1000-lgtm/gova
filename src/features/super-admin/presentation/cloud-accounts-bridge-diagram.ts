import { CLOUD_ACCOUNTS_COPY } from "./cloud-accounts-copy";
import type { CloudAccountsFacts } from "./cloud-accounts-facts.types";

/**
 * The browser-side routing picture, drawn from the route-ownership groups.
 *
 * Each owner is listed with the number of patterns it answers; the frontend
 * deployment is drawn last with the routes it keeps and its redirect boundary.
 * Adding an owner or a pattern redraws the picture — there is no hand-drawn copy
 * to fall behind.
 */
export function cloudAccountsBridgeDiagram(facts: CloudAccountsFacts): string {
  const copy = CLOUD_ACCOUNTS_COPY.vercel;
  const branches = [
    ...facts.routeGroups.map((group) => ({ project: group.project, mark: String(group.patterns.length) })),
    ...(facts.govaBoundary
      ? [{ project: facts.govaBoundary.project, mark: copy.diagramBoundary(facts.govaBoundary) }]
      : []),
  ];
  const width = Math.max(...branches.map((branch) => branch.project.length));
  const lines = branches.map((branch, index) => {
    const connector = index === branches.length - 1 ? "└─►" : "├─►";
    return `     ${connector} ${branch.project.padEnd(width)}  ${branch.mark}`;
  });
  return [copy.diagramRoot, `  └─ ${facts.bridgePackage}`, ...lines].join("\n");
}
