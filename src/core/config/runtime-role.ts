/**
 * Which ASOL runtime this process is.
 *
 * gova and the workload runtimes are built from the same repository, so the
 * source alone cannot say what a given process is allowed to register. The role
 * is declared by the deployment and read here, in the configuration layer, so
 * the composition root can branch on it without reading the environment itself.
 *
 * The default is the full application: a missing value must not silently turn a
 * business deployment into a frontend that registers nothing.
 */
export type AsolRuntimeRole = "application" | "gova-frontend";

export function asolRuntimeRole(): AsolRuntimeRole {
  return process.env.ASOL_RUNTIME_ROLE?.trim() === "gova-frontend"
    ? "gova-frontend"
    : "application";
}

/** True in the gova deployment, which serves pages and implements no Business API. */
export function isGovaFrontendRuntime(): boolean {
  return asolRuntimeRole() === "gova-frontend";
}
