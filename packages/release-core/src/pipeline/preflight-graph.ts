import {
  DEPLOY_ALL_PREFLIGHT_SECTIONS,
  type DeployAllRunbookSection,
} from "../console/deploy-all-runbook";

/**
 * Preflight as a dependency graph instead of a straight line.
 *
 * The sections are ordered for a reader — environment, source, data, builds,
 * services — and running them in that order end to end is the safe thing to do
 * and also the slow thing to do: `lint`, `typecheck` and
 * the independent source checks share no state with each other and none can
 * affect the build that follows. Running them one after another is not a
 * guarantee, it is an accident of how a list is written.
 *
 * What is a guarantee is the small set of edges below. Generation before the
 * check that validates what it generated; the mirror sync before anything that
 * reads a mirror; the server build before the smoke test that starts it; the
 * static build before anything that inspects the static payload. Those are
 * declared, asserted, and are the only ordering the executor is allowed to
 * rely on.
 *
 * Concurrency is default-deny. A branch runs alongside others only when it is
 * listed here as `parallel`; anything unlisted — including a branch added
 * tomorrow — is `exclusive` and runs alone, because a step that writes tracked
 * files, binds a port, or drives the database cannot share the machine with
 * one that does the same.
 */
export type PreflightConcurrency = "parallel" | "exclusive";

export interface PreflightNode {
  readonly id: string;
  readonly command: string;
  readonly sectionId: string;
  readonly dependsOn: readonly string[];
  readonly concurrency: PreflightConcurrency;
  /**
   * Whether a failure stops the run immediately.
   *
   * Exclusive branches fail fast: everything after a broken build is measuring
   * a build that does not exist. Parallel quality checks do not — a run that
   * reports "lint and typecheck and architecture all failed" is one
   * fix cycle, and three sequential failures are three.
   */
  readonly failFast: boolean;
}

interface PreflightNodePolicy {
  readonly dependsOn: readonly string[];
  readonly concurrency: PreflightConcurrency;
  readonly failFast: boolean;
}

const parallelCheck = (dependsOn: readonly string[] = []): PreflightNodePolicy => ({
  dependsOn,
  concurrency: "parallel",
  failFast: false,
});

const exclusiveStep = (dependsOn: readonly string[] = []): PreflightNodePolicy => ({
  dependsOn,
  concurrency: "exclusive",
  failFast: true,
});

/**
 * Per-branch scheduling policy.
 *
 * A branch absent from this table is treated as `exclusive` with no
 * dependencies, which is always correct and never fast — the cost of forgetting
 * is a slower preflight, not an unsafe one.
 */
export const PREFLIGHT_NODE_POLICY: Readonly<Record<string, PreflightNodePolicy>> = {
  // Reads remote account state only.
  "production-doctor": parallelCheck(),
  "vercel-account-access": parallelCheck(),

  // Writes generated documentation, so it cannot share the tree.
  knowledge: exclusiveStep(),
  lint: parallelCheck(),
  types: parallelCheck(),
  // Validates, among other things, that generated knowledge is current.
  architecture: parallelCheck(["knowledge"]),
  // The `test` gate re-syncs service mirrors and touches the database.
  tests: exclusiveStep(),

  "local-db": exclusiveStep(),
  "release-schema": exclusiveStep(["local-db"]),

  // `build` runs schema sync against the local database.
  "server-build": exclusiveStep(["local-db", "release-schema"]),
  // Reads the route traces the server build just produced.
  "function-size": parallelCheck(["server-build"]),
  // Starts the built server on a real port.
  smoke: exclusiveStep(["server-build"]),
  // Rewrites the release manifest and the static payload.
  "static-build": exclusiveStep(["server-build"]),

  "service-mirror-sync": exclusiveStep(),
  "service-mirror-verify": parallelCheck(["service-mirror-sync"]),
  "service-builds": exclusiveStep(["service-mirror-sync"]),
  // Starts each built service on a real port.
  "service-smoke": exclusiveStep(["service-builds"]),
};

/** Branches that inspect the static or native payload and therefore need the static build first. */
export const STATIC_PAYLOAD_VERIFICATION_BRANCH_IDS: ReadonlySet<string> = new Set([
  "static-payload-verify",
  "native-payload-verify",
]);

export function buildPreflightGraph(
  sections: readonly DeployAllRunbookSection[] = DEPLOY_ALL_PREFLIGHT_SECTIONS,
): PreflightNode[] {
  const nodes: PreflightNode[] = [];
  for (const section of sections) {
    for (const branch of section.branches) {
      const policy = PREFLIGHT_NODE_POLICY[branch.id] ?? exclusiveStep();
      nodes.push({
        id: branch.id,
        command: branch.command,
        sectionId: section.id,
        dependsOn: policy.dependsOn,
        concurrency: policy.concurrency,
        failFast: policy.failFast,
      });
    }
  }
  return nodes;
}

export interface PreflightOrderingInvariant {
  readonly branchId: string;
  readonly requires: string;
  readonly reason: string;
}

/** Ordering the pipeline may never lose, whatever the section list looks like. */
export const PREFLIGHT_ORDERING_INVARIANTS: readonly PreflightOrderingInvariant[] = [
  {
    branchId: "architecture",
    requires: "knowledge",
    reason: "documentation generation must run before the check that validates generated knowledge",
  },
  {
    branchId: "service-mirror-verify",
    requires: "service-mirror-sync",
    reason: "a mirror is verified after it is synchronised, never before",
  },
  {
    branchId: "service-builds",
    requires: "service-mirror-sync",
    reason: "building a stale mirror proves nothing about what would be uploaded",
  },
  {
    branchId: "service-smoke",
    requires: "service-builds",
    reason: "a service is probed only after it builds the way Vercel builds it",
  },
  {
    branchId: "smoke",
    requires: "server-build",
    reason: "smoke:production starts the server build, so the build must exist first",
  },
  {
    branchId: "function-size",
    requires: "server-build",
    reason: "the function size budget is measured from the build's own route traces",
  },
  {
    branchId: "static-build",
    requires: "server-build",
    reason: "the static export stays the final release artifact, produced after the server build",
  },
];

/** Throws when a required edge is missing, or when the graph cannot be ordered. */
export function assertPreflightGraphInvariants(nodes: readonly PreflightNode[]): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  for (const invariant of PREFLIGHT_ORDERING_INVARIANTS) {
    const node = byId.get(invariant.branchId);
    if (!node || !byId.has(invariant.requires)) continue;
    if (!reaches(byId, invariant.branchId, invariant.requires)) {
      throw new Error(
        `Preflight ordering invariant broken: "${invariant.branchId}" must run after "${invariant.requires}" — ${invariant.reason}.`,
      );
    }
  }

  for (const node of nodes) {
    if (!STATIC_PAYLOAD_VERIFICATION_BRANCH_IDS.has(node.id)) continue;
    if (!byId.has("static-build")) continue;
    if (!reaches(byId, node.id, "static-build")) {
      throw new Error(
        `Preflight ordering invariant broken: "${node.id}" verifies the static/native payload and must depend on "static-build".`,
      );
    }
  }

  for (const node of nodes) {
    for (const dependency of node.dependsOn) {
      if (!byId.has(dependency)) {
        throw new Error(
          `Preflight branch "${node.id}" depends on "${dependency}", which is not a preflight branch.`,
        );
      }
    }
  }

  // Ordering the whole graph proves it is acyclic.
  planPreflightWaves(nodes);
}

function reaches(
  byId: ReadonlyMap<string, PreflightNode>,
  fromId: string,
  targetId: string,
  seen = new Set<string>(),
): boolean {
  if (seen.has(fromId)) return false;
  seen.add(fromId);
  const node = byId.get(fromId);
  if (!node) return false;
  for (const dependency of node.dependsOn) {
    if (dependency === targetId) return true;
    if (reaches(byId, dependency, targetId, seen)) return true;
  }
  return false;
}

export interface PreflightWave {
  readonly mode: PreflightConcurrency;
  readonly nodes: readonly PreflightNode[];
}

/**
 * Order the graph into waves the executor can run.
 *
 * Each wave is either one exclusive branch or a group of parallel branches
 * whose dependencies are already satisfied. Parallel branches are preferred
 * whenever any are ready, so the cheap checks finish while the expensive
 * exclusive steps are still ahead.
 *
 * `selectedIds`, when given, restricts the run to those branches. A dependency
 * outside the selection is treated as already satisfied: the operator asked to
 * re-run one branch, and the executor's job is to run it, not to silently pull
 * in a build they did not ask for. What must never be skipped is enforced by
 * the checkpoint rules, not here.
 */
export function planPreflightWaves(
  nodes: readonly PreflightNode[],
  selectedIds?: ReadonlySet<string>,
): PreflightWave[] {
  const selected = nodes.filter((node) => !selectedIds || selectedIds.has(node.id));
  const selectedSet = new Set(selected.map((node) => node.id));
  const satisfied = new Set<string>();
  const remaining = [...selected];
  const waves: PreflightWave[] = [];

  while (remaining.length > 0) {
    const ready = remaining.filter((node) =>
      node.dependsOn.every((dependency) => !selectedSet.has(dependency) || satisfied.has(dependency)),
    );
    if (ready.length === 0) {
      throw new Error(
        `Preflight dependency cycle involving: ${remaining.map((node) => node.id).join(", ")}.`,
      );
    }

    const parallel = ready.filter((node) => node.concurrency === "parallel");
    const wave: PreflightWave =
      parallel.length > 0
        ? { mode: "parallel", nodes: parallel }
        : { mode: "exclusive", nodes: [ready[0]!] };

    for (const node of wave.nodes) {
      satisfied.add(node.id);
      remaining.splice(remaining.indexOf(node), 1);
    }
    waves.push(wave);
  }

  return waves;
}
