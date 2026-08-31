/**
 * The local agent control plane.
 *
 * One package for the system that lets several agents work on this repository at
 * once across more than one machine: agent identity and heartbeats, scope locks,
 * the request contract and its ledger, isolated worktrees, the operation log, and
 * the memory admission gate that decides when a mutation may start.
 *
 * The CLIs under `scripts/local-agent-*.ts` are thin wrappers around this door,
 * the same way `scripts/architecture-check.ts` wraps `@asol/architecture-core`:
 * a sealed package must not reach back into application scripts, so anything
 * needing the repository's own workflows or data stays in the CLI.
 */

export * from "./agent-registry";
export * from "./admission";
export * from "./control-branch";
export * from "./control-branch-namespaces";
export * from "./coordination-snapshot";
export * from "./git";
export * from "./github-api";
export * from "./host-discovery";
export * from "./json-store";
export * from "./lock-store";
export * from "./message-store";
export * from "./operation-log";
export * from "./paths";
export * from "./request-contract";
export * from "./request-store";
export * from "./secret-paths";
export * from "./swap-hygiene";
export * from "./worktree";
