/**
 * Branch namespaces the local agent control plane owns.
 *
 * `main` is still the only branch that carries the project. These three are
 * machinery, and each has to be able to come into existence or the control plane
 * cannot work at all:
 *
 * - `codex/**` — one isolated result branch per mutating agent, which is what
 *   makes parallel agents possible instead of serializing every job on `main`.
 * - `agent-request/**` — the inbound dispatch channel for agents without
 *   `workflow_dispatch` API access. The gateway deletes each one once processed.
 * - `agent-control` — the output-only coordination snapshot cloud agents read.
 *
 * The list lives on its own so both the `main-only` ruleset script and the CI
 * policy can read it without either one importing the other's behaviour. The
 * same allowance is mirrored in `.githooks/pre-push.d/10-main-only`.
 */
export const CONTROL_PLANE_BRANCH_NAMESPACES = [
  "refs/heads/codex/**",
  "refs/heads/agent-request/**",
  "refs/heads/agent-control",
] as const;
