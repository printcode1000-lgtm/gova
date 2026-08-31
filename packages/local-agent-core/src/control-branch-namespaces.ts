/**
 * The only non-main remote branch recognized by the repository.
 *
 * The exported name is retained for API compatibility with existing policy code,
 * but this is no longer a wildcard namespace list. Remote branch creation is
 * limited to `main` plus this exact ChatGPT branch.
 */
export const CONTROL_PLANE_BRANCH_NAMESPACES = [
  "refs/heads/agent-request/chatgpt",
] as const;
